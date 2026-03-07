import { Router } from "express";
import { createContact, getContacts } from "../controllers/contact.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { contactSchema } from "../validations/contact.validation.js";
import rateLimit from 'express-rate-limit';

const contactRouter = Router();

// Strict rate limit for contact form submissions (e.g., 5 per hour per IP)
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        success: false,
        message: 'Too many contact requests. Please try again after an hour.'
    }
});

contactRouter.post("/", contactLimiter, validate(contactSchema), createContact);
contactRouter.get("/", authorize, getContacts);

export default contactRouter;
