import mongoose from "mongoose";
import { MONGODB_URI_USERS } from "../config/env.js";

if (!MONGODB_URI_USERS) {
    throw new Error("Please add the MONGODB URI in the env variables!");
}

const connectToDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI_USERS);
        console.log("Connected to the MongoDB database!");
    } catch (error) {
        console.log("Error connecting to the MongoDB database: ", error);
    }
}

export default connectToDB;