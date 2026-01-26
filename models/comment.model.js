import mongoose from "mongoose";
import { productConnection } from "../database/mongodb.js";

const commentSchema = new mongoose.Schema({
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
    content: {
        type: String,
        required: [true, "Comment content is required"],
        trim: true,
        maxlength: 1000
    }
}, { timestamps: true });

const Comment = productConnection.model("Comment", commentSchema);

export default Comment;
