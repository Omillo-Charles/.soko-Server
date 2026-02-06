import axios from "axios";
import { 
    MPESA_CONSUMER_KEY, 
    MPESA_CONSUMER_SECRET, 
    MPESA_ENVIRONMENT 
} from "../config/env.js";

/**
 * Generates a Safaricom Daraja API access token
 * @returns {Promise<string>} The access token
 */
export const getMpesaAccessToken = async () => {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
    const url = MPESA_ENVIRONMENT === "sandbox" 
        ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        : "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("M-Pesa Access Token Error:", error.response?.data || error.message);
        throw new Error("Failed to generate M-Pesa access token");
    }
};

/**
 * Generates a timestamp in the format YYYYMMDDHHmmss
 * @returns {string} The formatted timestamp
 */
export const getMpesaTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};
