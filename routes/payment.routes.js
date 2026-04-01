import express from "express";
import { initiateSTKPush, stkCallback, getTransactionStatus, linkPaymentToOrder } from "../controllers/payment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { stkPushSchema, linkPaymentToOrderSchema } from "../validations/payment.validation.js";

const router = express.Router();

// Route to initiate STK Push - Protected
router.post("/stk-push", authMiddleware, validate(stkPushSchema), initiateSTKPush);

// Route to link payment to order - Protected
router.post("/link-order", authMiddleware, validate(linkPaymentToOrderSchema), linkPaymentToOrder);

// Route to check transaction status - Protected
router.get("/status/:checkoutRequestId", authMiddleware, getTransactionStatus);

// Callback route for M-Pesa results - Public (Safaricom calls this)
router.post("/callback", stkCallback);

export default router;
