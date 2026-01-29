import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    name: String,
    price: Number,
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    image: String,
    size: String,
    color: String
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    shippingAddress: {
        name: String,
        phone: String,
        city: String,
        street: String
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        default: 'Cash on Delivery'
    }
}, { timestamps: true });

const Order = userConnection.model("Order", orderSchema);

export default Order;
