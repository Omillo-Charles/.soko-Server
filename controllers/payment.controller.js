import axios from "axios";
import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import { 
    MPESA_SHORTCODE, 
    MPESA_PASSKEY, 
    MPESA_CALLBACK_URL, 
    MPESA_ENVIRONMENT
} from "../config/env.js";
import { getMpesaAccessToken, getMpesaTimestamp } from "../utils/mpesa.js";
import MpesaTransaction from "../models/mpesaTransaction.model.js";

// Helper to activate premium status
const activatePremium = async (userId, planName, isAnnual) => {
    const user = await User.findById(userId);
    if (user) {
        user.isPremium = true;
        user.premiumPlan = planName;
        
        // Set expiration date
        const expiryDate = new Date();
        if (isAnnual) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        user.premiumUntil = expiryDate;
        await user.save();

        // Also verify the shop if the user is a seller
        if (user.accountType === "seller") {
            await Shop.findOneAndUpdate(
                { owner: userId },
                { isVerified: true }
            );
        }
        
        console.log(`Premium status activated for user ${user.email} until ${expiryDate}`);
        return true;
    }
    return false;
};

export const initiateSTKPush = async (req, res, next) => {
    try {
        const { phoneNumber, amount, metadata } = req.body;
        console.log(`Initiating STK Push for amount: ${amount}, phone: ${phoneNumber}`);
        const userId = req.user?._id;

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
            // Save pending transaction to DB
            await MpesaTransaction.create({
                merchantRequestId: response.data.MerchantRequestID,
                checkoutRequestId: response.data.CheckoutRequestID,
                amount,
                phoneNumber: formattedPhone,
                userId,
                metadata,
                status: 'pending'
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

        const transaction = await MpesaTransaction.findOne({ checkoutRequestId: CheckoutRequestID });

        if (!transaction) {
            console.error("Transaction not found for CheckoutRequestID:", CheckoutRequestID);
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        transaction.resultCode = ResultCode;
        transaction.resultDesc = ResultDesc;

        if (ResultCode === 0) {
            // Success
            transaction.status = 'completed';
            
            // Extract metadata
            if (CallbackMetadata && CallbackMetadata.Item) {
                const items = CallbackMetadata.Item;
                const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
                if (receiptItem) {
                    transaction.mpesaReceiptNumber = receiptItem.Value;
                }
            }
            transaction.transactionDate = new Date();
            
            // Save transaction FIRST before attempting activation
            await transaction.save();

            // Handle Premium Upgrade
            if (transaction.metadata?.type === "premium_upgrade") {
                try {
                    const { planName, isAnnual } = transaction.metadata;
                    await activatePremium(transaction.userId, planName, isAnnual);
                } catch (activationError) {
                    console.error("Premium Activation Error:", activationError);
                    // We don't fail the transaction if activation fails, but we should log it
                    // Ideally we should have a way to retry activation
                }
            }
            
            console.log(`Payment successful for ${transaction.phoneNumber}. Receipt: ${transaction.mpesaReceiptNumber}`);
        } else {
            // Failed or Cancelled
            transaction.status = 'failed';
            console.log(`Payment failed for ${transaction.phoneNumber}: ${ResultDesc}`);
            await transaction.save();
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
        const transaction = await MpesaTransaction.findOne({ checkoutRequestId });

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

                transaction.resultCode = ResultCode;
                transaction.resultDesc = ResultDesc;

                if (ResultCode === "0") { // Note: Query API returns string "0" sometimes, callback returns number 0
                    transaction.status = 'completed';
                    transaction.transactionDate = new Date();
                    await transaction.save();

                    // Activate Premium if needed
                    if (transaction.metadata?.type === "premium_upgrade") {
                        const { planName, isAnnual } = transaction.metadata;
                        await activatePremium(transaction.userId, planName, isAnnual);
                    }
                } else {
                    // If ResultCode is NOT 0, it means the user cancelled or failed payment
                    // BUT be careful: "1032" is Cancelled.
                    // If Safaricom returns a ResultCode, the transaction is FINAL.
                    transaction.status = 'failed';
                    await transaction.save();
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
