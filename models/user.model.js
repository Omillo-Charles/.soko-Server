import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

const addressSchema = mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ["home", "work", "other"], default: "home" },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
});

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        minlength: 3,
        maxlength: 30,
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: {
        type: String,
        required: function() { return !this.googleId && !this.githubId; }, // Only required if not a social login
        minlength: 6,
        select: false,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple users to have null googleId
    },
    githubId: {
        type: String,
        unique: true,
        sparse: true,
    },
    refreshToken: {
        type: String,
        select: false,
    },
    resetPasswordToken: {
        type: String,
        select: false,
    },
    resetPasswordExpires: {
        type: Date,
        select: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationOTP: {
        type: String,
        select: false,
    },
    verificationOTPExpires: {
        type: Date,
        select: false,
    },
    accountType: {
        type: String,
        enum: ["buyer", "seller"],
        default: "buyer",
    },
    addresses: [addressSchema]
}, { timestamps: true });

const User = userConnection.model("User", userSchema);

export default User;