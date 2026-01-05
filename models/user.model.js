import mongoose from "mongoose";

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
        required: [true, "Password is required!"],
        minlength: 6,
        select: false,
    },
    refreshToken: {
        type: String,
        select: false,
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;