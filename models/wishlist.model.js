import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }]
}, { timestamps: true });

const Wishlist = userConnection.model("Wishlist", wishlistSchema);

export default Wishlist;
