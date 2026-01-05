import Contact from "../models/contact.model.js";

export const createContact = async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;

        const newContact = await Contact.create({
            name,
            email,
            subject,
            message
        });

        res.status(201).json({
            success: true,
            message: "Contact form submitted successfully!",
            data: newContact
        });
    } catch (error) {
        next(error);
    }
};

export const getContacts = async (req, res, next) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: contacts
        });
    } catch (error) {
        next(error);
    }
};
