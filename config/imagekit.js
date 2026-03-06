import ImageKit from "imagekit";
import multer from "multer";
import { 
    IMAGEKIT_PUBLIC_KEY, 
    IMAGEKIT_PRIVATE_KEY, 
    IMAGEKIT_URL_ENDPOINT 
} from "./env.js";

// Initialize ImageKit with official SDK
const imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY || "placeholder",
    privateKey: IMAGEKIT_PRIVATE_KEY || "placeholder",
    urlEndpoint: IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/placeholder"
});

// Use memory storage to avoid writing files to disk
// We will upload to ImageKit manually in the controllers
const storage = multer.memoryStorage();

export const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

/**
 * Helper to upload a single file to ImageKit
 * @param {Object} file - The file object from multer (req.file or req.files[i])
 * @param {String} folder - The ImageKit folder path
 * @returns {Promise<Object>} - ImageKit upload response
 */
export const uploadToImageKit = async (file, folder = "duuka/others") => {
    if (!file) return null;
    
    try {
        const response = await imagekit.upload({
            file: file.buffer, // Buffer from memoryStorage
            fileName: `${Date.now()}-${file.originalname}`,
            folder: folder,
            useUniqueFileName: true
        });
        return response;
    } catch (error) {
        console.error("ImageKit Upload Error:", error);
        throw new Error("Failed to upload image to ImageKit");
    }
};

export { imagekit };
