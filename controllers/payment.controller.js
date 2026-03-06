import axios from "axios";
import prisma from "../database/postgresql.js";
import { 
    MPESA_SHORTCODE, 
    MPESA_PASSKEY, 
    MPESA_CALLBACK_URL, 
    MPESA_ENVIRONMENT
} from "../config/env.js";
import { getMpesaAccessToken, getMpesaTimestamp } from "../utils/mpesa.js";
// Prisma model: MpesaTransaction

// Helper to activate premium status
const activatePremium = async (userId, planName, isAnnual) => {
    try {
        console.log(`Activating premium for user ${userId} with plan ${planName}`);
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            const expiryDate = new Date();
            if (isAnnual) {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            } else {
                expiryDate.setMonth(expiryDate.getMonth() + 1);
            }
            await prisma.user.update({
                where: { id: userId },
                data: {
                    isPremium: true,
                    premiumPlan: planName,
                    premiumUntil: expiryDate
                }
            });

            if (user.accountType === "seller") {
                const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
                if (shop) {
                    await prisma.shop.update({ where: { id: shop.id }, data: { isVerified: true } });
                }
            }
            
            console.log(`Premium status activated for user ${user.email} until ${expiryDate}`);
            return true;
        } else {
            console.error(`User ${userId} not found during activation`);
            return false;
        }
    } catch (error) {
        console.error("Error in activatePremium:", error);
        return false;
    }
};

export const initiateSTKPush = async (req, res, next) => {
    try {
        const { phoneNumber, amount, metadata } = req.body;
        console.log(`Initiating STK Push for amount: ${amount}, phone: ${phoneNumber}`);
        const userId = req.user?.id || req.user?._id?.toString();

        if (!userId) {
             return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!phoneNumber || !amount) {
            return res.status(400).json({ success: false, message: "Phone number and amount are required" });
        }

        // Format phone number to 2547XXXXXXXX
        let formattedPhone = phoneNumber.replace(/^(?:\+254|0)/, "254");
        if (!formattedPhone.startsWith("254")) {
            formattedPhone = "254" + formattedPhone;
        }

        const accessToken = await getMpesaAccessToken();
        const timestamp = getMpesaTimestamp();
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");

        const url = MPESA_ENVIRONMENT === "sandbox"
            ? "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
            : "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        const response = await axios.post(url, {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: MPESA_CALLBACK_URL,
            AccountReference: ".Soko Ecommerce",
            TransactionDesc: "Premium Upgrade"
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.data.ResponseCode === "0") {
            await prisma.mpesaTransaction.create({
                data: {
                    merchantRequestId: response.data.MerchantRequestID,
                    checkoutRequestId: response.data.CheckoutRequestID,
                    amount,
                    phoneNumber: formattedPhone,
                    userId,
                    metadata,
                    status: 'pending'
                }
            });

            return res.status(200).json({
                success: true,
                message: "STK Push initiated successfully",
                data: response.data
            });
        } else {
            return res.status(400).json({
                success: false,
                message: response.data.ResponseDescription || "Failed to initiate STK Push"
            });
        }

    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        next(error);
    }
};

export const stkCallback = async (req, res) => {
    try {
        const { Body } = req.body;
        const stkCallback = Body.stkCallback;

        console.log("M-Pesa Callback Received:", JSON.stringify(stkCallback, null, 2));

        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

        const transaction = await prisma.mpesaTransaction.findUnique({ where: { checkoutRequestId: CheckoutRequestID } });

        if (!transaction) {
            console.error("Transaction not found for CheckoutRequestID:", CheckoutRequestID);
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        await prisma.mpesaTransaction.update({
            where: { id: transaction.id },
            data: {
                resultCode: ResultCode,
                resultDesc: ResultDesc
            }
        });

        const refreshed = await prisma.mpesaTransaction.findUnique({ where: { id: transaction.id } });
        if (refreshed.status === 'completed') {
            console.log(`Transaction ${CheckoutRequestID} already completed. Updating metadata only.`);
            
            if (CallbackMetadata && CallbackMetadata.Item) {
                const items = CallbackMetadata.Item;
                const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
                if (receiptItem) {
                    await prisma.mpesaTransaction.update({
                        where: { id: refreshed.id },
                        data: { mpesaReceiptNumber: receiptItem.Value }
                    });
                }
            }
            return res.status(200).json({ success: true });
        }

        if (ResultCode === 0) {
            let receipt = null;
            
            if (CallbackMetadata && CallbackMetadata.Item) {
                const items = CallbackMetadata.Item;
                const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
                if (receiptItem) {
                    receipt = receiptItem.Value;
                }
            }
            const updatedTx = await prisma.mpesaTransaction.update({
                where: { id: refreshed.id },
                data: {
                    status: 'completed',
                    mpesaReceiptNumber: receipt,
                    transactionDate: new Date()
                }
            });

            if (updatedTx.metadata?.type === "premium_upgrade") {
                try {
                    const { planName, isAnnual } = updatedTx.metadata;
                    await activatePremium(updatedTx.userId || undefined, planName, isAnnual);
                } catch (activationError) {
                    console.error("Premium Activation Error:", activationError);
                }
            }
            
            console.log(`Payment successful for ${updatedTx.phoneNumber}. Receipt: ${receipt}`);
        } else {
            await prisma.mpesaTransaction.update({
                where: { id: refreshed.id },
                data: { status: 'failed' }
            });
            console.log(`Payment failed for ${refreshed.phoneNumber}: ${ResultDesc}`);
        }

        // Safaricom expects a 200 OK response
        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Callback Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTransactionStatus = async (req, res, next) => {
    try {
        const { checkoutRequestId } = req.params;
        const transaction = await prisma.mpesaTransaction.findUnique({ where: { checkoutRequestId } });

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        // If transaction is already completed or failed, return status
        if (transaction.status !== 'pending') {
            return res.status(200).json({
                success: true,
                status: transaction.status,
                resultCode: transaction.resultCode,
                resultDesc: transaction.resultDesc
            });
        }

        // If pending, Query Safaricom API to check actual status
        try {
            const accessToken = await getMpesaAccessToken();
            const timestamp = getMpesaTimestamp();
            const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");

            const url = MPESA_ENVIRONMENT === "sandbox"
                ? "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
                : "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";

            const response = await axios.post(url, {
                BusinessShortCode: MPESA_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (response.data.ResponseCode === "0") {
                // We got a valid response from Safaricom Query
                const { ResultCode, ResultDesc } = response.data;

                let finalTx = await prisma.mpesaTransaction.update({
                    where: { id: transaction.id },
                    data: {
                        resultCode: ResultCode,
                        resultDesc: ResultDesc
                    }
                });

                if (ResultCode === "0") {
                    finalTx = await prisma.mpesaTransaction.update({
                        where: { id: transaction.id },
                        data: { status: 'completed', transactionDate: new Date() }
                    });

                    if (finalTx.metadata?.type === "premium_upgrade") {
                        const { planName, isAnnual } = finalTx.metadata;
                        await activatePremium(finalTx.userId || undefined, planName, isAnnual);
                    }
                } else {
                    await prisma.mpesaTransaction.update({
                        where: { id: transaction.id },
                        data: { status: 'failed' }
                    });
                }

                return res.status(200).json({
                    success: true,
                    status: transaction.status,
                    resultCode: transaction.resultCode,
                    resultDesc: transaction.resultDesc
                });
            } 
            // If ResponseCode is not 0, maybe the request is still processing?
            // "The service request is processed successfully" is ResponseCode 0.
            
        } catch (queryError) {
            console.error("M-Pesa Query Error:", queryError.response?.data || queryError.message);
            // If query fails, just return the current DB status (pending)
        }

        res.status(200).json({
            success: true,
            status: transaction.status,
            resultCode: transaction.resultCode,
            resultDesc: transaction.resultDesc
        });
    } catch (error) {
        next(error);
    }
};
