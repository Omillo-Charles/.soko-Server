import mongoose from "mongoose";
import { userConnection } from "../database/mongodb.js";

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
    }
}, { timestamps: true });

const User = userConnection.model("User", userSchema);

export default User;