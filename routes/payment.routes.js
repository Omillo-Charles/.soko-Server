import express from "express";
import { initiateSTKPush, stkCallback, getTransactionStatus } from "../controllers/payment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { stkPushSchema } from "../validations/payment.validation.js";

const router = express.Router();

// Route to initiate STK Push - Protected
router.post("/stk-push", authMiddleware, validate(stkPushSchema), initiateSTKPush);

// Route to check transaction status - Protected
router.get("/status/:checkoutRequestId", authMiddleware, getTransactionStatus);

// Callback route for M-Pesa results - Public (Safaricom calls this)
router.post("/callback", stkCallback);

export default router;
