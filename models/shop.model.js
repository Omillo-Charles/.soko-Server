import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

const shopSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, "Shop name is required"],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    description: {
        type: String,
        required: [true, "Shop description is required"],
        trim: true,
        maxlength: 500
    },
    category: {
        type: String,
        required: [true, "Shop category is required"],
    },
    address: {
        type: String,
        required: [true, "Shop address is required"],
    },
    phone: {
        type: String,
        required: [true, "Shop phone number is required"],
    },
    email: {
        type: String,
        required: [true, "Shop email is required"],
    },
    avatar: {
        type: String,
        default: ""
    },
    banner: {
        type: String,
        default: ""
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    followersCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Shop = userConnection.model("Shop", shopSchema);

export default Shop;
