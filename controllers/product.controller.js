import Product from "../models/product.model.js";
import Shop from "../models/shop.model.js";

export const createProduct = async (req, res, next) => {
    try {
        const { name, description, content, price, category, stock } = req.body;
        
        // Find user's shop
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            const error = new Error('User does not have a shop. Please register a shop first.');
            error.statusCode = 403;
            throw error;
        }

        // Get image URL from Cloudinary if uploaded
        const image = req.file ? req.file.path : req.body.image;

        if (!image) {
            const error = new Error('Please upload an image or provide an image link.');
            error.statusCode = 400;
            throw error;
        }

        const product = await Product.create({
            shop: shop._id,
            name,
            description,
            content: content || description,
            price,
            category,
            stock,
            image
        });

        res.status(201).json({
            success: true,
            message: "Product posted successfully",
            data: product
        });
    } catch (error) {
        next(error);
    }
};

export const getProducts = async (req, res, next) => {
    try {
        const { q, cat, shop } = req.query;
        let query = {};

        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        if (cat && cat !== 'all') {
            query.category = cat;
        }

        if (shop) {
            query.shop = shop;
        }

        const products = await Product.find(query)
            .populate({ path: 'shop', select: 'name username avatar isVerified', model: Shop })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

export const getProductsByShopId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const products = await Product.find({ shop: id })
            .populate({ path: 'shop', select: 'name username avatar isVerified', model: Shop })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

export const getMyProducts = async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            return res.status(200).json({ success: true, data: [] });
        }

        const products = await Product.find({ shop: shop._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate({ path: 'shop', select: 'name username avatar isVerified', model: Shop });
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await Shop.findOne({ owner: req.user._id });
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const product = await Product.findOne({ _id: id, shop: shop._id });
        if (!product) {
            const error = new Error('Product not found or unauthorized');
            error.statusCode = 404;
            throw error;
        }

        const updates = { ...req.body };
        if (req.file) {
            updates.image = req.file.path;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await Shop.findOne({ owner: req.user._id });
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const product = await Product.findOneAndDelete({ _id: id, shop: shop._id });
        if (!product) {
            const error = new Error('Product not found or unauthorized');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
