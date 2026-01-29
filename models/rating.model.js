import mongoose from "mongoose";
import { productConnection } from "../database/mongodb.js";

const ratingSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: false,
        trim: true,
        maxlength: 500
    }
}, { timestamps: true });

// Ensure a user can only rate a product once
ratingSchema.index({ product: 1, user: 1 }, { 
    unique: true, 
    partialFilterExpression: { product: { $type: "objectId" } } 
});

// Ensure a user can only rate a shop once
ratingSchema.index({ shop: 1, user: 1 }, { 
    unique: true, 
    partialFilterExpression: { shop: { $type: "objectId" } } 
});

const Rating = productConnection.model("Rating", ratingSchema);

export default Rating;
