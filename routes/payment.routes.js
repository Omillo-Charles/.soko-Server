import express from "express";
import { initiateSTKPush, stkCallback } from "../controllers/payment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// Route to initiate STK Push - Protected
router.post("/stk-push", authMiddleware, initiateSTKPush);

// Callback route for M-Pesa results - Public (Safaricom calls this)
router.post("/callback", stkCallback);

export default router;
