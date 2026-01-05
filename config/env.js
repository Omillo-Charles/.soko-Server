import { config } from "dotenv";

config({ path: '.env' });

export const {
    PORT,
    MONGODB_URI_USERS,
    JWT_SECRET,
    JWT_EXPIRY,
    JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRY,
    NODE_ENV,
} = process.env;