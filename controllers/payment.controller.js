import axios from "axios";
import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import { 
    MPESA_SHORTCODE, 
    MPESA_PASSKEY, 
    MPESA_CALLBACK_URL, 
    MPESA_ENVIRONMENT,
    BACKEND_TUNNEL_URL
} from "../config/env.js";
import { getMpesaAccessToken, getMpesaTimestamp } from "../utils/mpesa.js";
import MpesaTransaction from "../models/mpesaTransaction.model.js";

export const initiateSTKPush = async (req, res, next) => {
    try {
        const { phoneNumber, amount, metadata } = req.body;
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

        // Use BACKEND_TUNNEL_URL if available, otherwise fallback to MPESA_CALLBACK_URL
        const callbackUrl = BACKEND_TUNNEL_URL 
            ? `${BACKEND_TUNNEL_URL.replace(/\/$/, '')}/api/v1/payments/callback`
            : MPESA_CALLBACK_URL;

        const response = await axios.post(url, {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
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
            const items = CallbackMetadata.Item;
            transaction.mpesaReceiptNumber = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            transaction.transactionDate = new Date(); // Or parse from timestamp if needed
            
            // Handle Premium Upgrade
            if (transaction.metadata?.type === "premium_upgrade") {
                const { planName, isAnnual } = transaction.metadata;
                const userId = transaction.userId;

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
                }
            }
            
            console.log(`Payment successful for ${transaction.phoneNumber}. Receipt: ${transaction.mpesaReceiptNumber}`);
        } else {
            // Failed or Cancelled
            transaction.status = 'failed';
            console.log(`Payment failed for ${transaction.phoneNumber}: ${ResultDesc}`);
        }

        await transaction.save();

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
