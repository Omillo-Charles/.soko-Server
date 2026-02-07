import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

const activitySchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["view", "click", "wishlist", "cart", "purchase", "search"],
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: false, // Optional for 'search' type
        index: true,
    },
    category: {
        type: String,
        required: false,
    },
    searchQuery: {
        type: String,
        required: false,
    },
    weight: {
        type: Number,
        default: 1, // Default weight for a basic view/click
    }
}, { timestamps: true });

// TTL Index: Automatically delete activities older than 30 days to keep the database clean
// and ensure recommendations are based on recent behavior.
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Activity = userConnection.model("Activity", activitySchema);

export default Activity;
