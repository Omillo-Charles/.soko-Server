import { config } from "dotenv";

config({ url: '.env' });

export const {
    PORT,
    MONGODB_URI_USERS,
    JWT_SECRET,
    JWT_EXPIRY,
} = process.env;