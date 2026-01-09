import Shop from "../models/shop.model.js";

export const createShop = async (req, res, next) => {
    try {
        const { name, description, category, address, phone, email } = req.body;
        
        // Check if user already has a shop
        const existingShop = await Shop.findOne({ owner: req.user._id });
        if (existingShop) {
            const error = new Error('User already has a shop');
            error.statusCode = 400;
            throw error;
        }

        const shop = await Shop.create({
            owner: req.user._id,
            name,
            description,
            category,
            address,
            phone,
            email
        });

        res.status(201).json({
            success: true,
            message: "Shop created successfully",
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

export const getMyShop = async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });

        res.status(200).json({
            success: true,
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

export const getShopById = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.params.id);
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: shop
        });
    } catch (error) {
        next(error);
    }
};
