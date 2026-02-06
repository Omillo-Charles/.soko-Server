import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

const mpesaTransactionSchema = new mongoose.Schema({
    merchantRequestId: { type: String, required: true },
    checkoutRequestId: { type: String, required: true, unique: true },
    resultCode: { type: Number },
    resultDesc: { type: String },
    amount: { type: Number },
    mpesaReceiptNumber: { type: String },
    transactionDate: { type: Date },
    phoneNumber: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Object } // To store plan info, etc.
}, { timestamps: true });

const MpesaTransaction = userConnection.model("MpesaTransaction", mpesaTransactionSchema);

export default MpesaTransaction;
