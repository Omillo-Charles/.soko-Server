import mongoose from "mongoose";
import { productConnection } from "../database/mongodb.js";

const ratingSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
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
    }
}, { timestamps: true });

// Ensure a user can only rate a product once
ratingSchema.index({ product: 1, user: 1 }, { unique: true });

const Rating = productConnection.model("Rating", ratingSchema);

export default Rating;
