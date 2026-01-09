import mongoose from "mongoose";
import { productConnection } from "../database/mongodb.js";

const productSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: [true, "Product description is required"],
        trim: true,
        maxlength: 2000
    },
    content: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: [true, "Product price is required"],
        min: 0
    },
    category: {
        type: String,
        required: [true, "Product category is required"]
    },
    stock: {
        type: Number,
        required: [true, "Product stock is required"],
        default: 1
    },
    image: {
        type: String,
        default: ""
    },
    rating: {
        type: Number,
        default: 0
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    repostsCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Product = productConnection.model("Product", productSchema);

export default Product;
