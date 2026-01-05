import mongoose from "mongoose";
import { contactConnection } from "../database/mongodb.js";

const contactSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    subject: {
        type: String,
        required: [true, "Subject is required"],
        trim: true,
    },
    message: {
        type: String,
        required: [true, "Message is required"],
        trim: true,
    }
}, { timestamps: true });

const Contact = contactConnection.model("Contact", contactSchema);

export default Contact;
