import Shop from "../models/shop.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Wishlist from "../models/wishlist.model.js";

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

export const updateShop = async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        // Handle file uploads if present
        if (req.files) {
            if (req.files.avatar) {
                shop.avatar = req.files.avatar[0].path;
            }
            if (req.files.banner) {
                shop.banner = req.files.banner[0].path;
            }
        }

        // Handle other fields
        const updateFields = ['name', 'description', 'category', 'address', 'phone', 'email'];
        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                shop[field] = req.body[field];
            }
        });

        await shop.save();

        res.status(200).json({
            success: true,
            message: "Shop updated successfully",
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

export const deleteShop = async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        // 1. Find all products belonging to this shop
        const products = await Product.find({ shop: shop._id });
        const productIds = products.map(p => p._id);

        if (productIds.length > 0) {
            // 2. Remove products from all Carts
            await Cart.updateMany(
                { "items.product": { $in: productIds } },
                { $pull: { items: { product: { $in: productIds } } } }
            );

            // 3. Remove products from all Wishlists
            await Wishlist.updateMany(
                { products: { $in: productIds } },
                { $pull: { products: { $in: productIds } } }
            );

            // 4. Delete all products belonging to the shop
            await Product.deleteMany({ shop: shop._id });
        }

        // 5. Delete the shop itself
        await Shop.findByIdAndDelete(shop._id);

        res.status(200).json({
            success: true,
            message: "Shop and all associated products deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
