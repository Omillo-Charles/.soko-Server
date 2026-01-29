import Product from "../models/product.model.js";
import Shop from "../models/shop.model.js";
import Rating from "../models/rating.model.js";

export const rateProduct = async (req, res, next) => {
    try {
        const { id: productId } = req.params;
        const { rating } = req.body;
        const userId = req.user._id;

        if (!rating || rating < 1 || rating > 5) {
            const error = new Error('Please provide a valid rating between 1 and 5');
            error.statusCode = 400;
            throw error;
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        // Update or create rating
        const existingRating = await Rating.findOne({ product: productId, user: userId });
        
        if (existingRating) {
            existingRating.rating = rating;
            await existingRating.save();
        } else {
            await Rating.create({
                product: productId,
                user: userId,
                rating
            });
        }

        // Recalculate average rating
        const ratings = await Rating.find({ product: productId });
        const reviewsCount = ratings.length;
        const averageRating = ratings.reduce((sum, item) => sum + item.rating, 0) / reviewsCount;

        // Update product with new rating info
        product.rating = averageRating;
        product.reviewsCount = reviewsCount;
        await product.save();

        res.status(200).json({
            success: true,
            message: "Rating submitted successfully",
            data: {
                rating: averageRating,
                reviewsCount
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createProduct = async (req, res, next) => {
    try {
        const { name, description, content, price, category, stock, sizes, colors } = req.body;
        
        // Find user's shop
        const shop = await Shop.findOne({ owner: req.user._id });
        if (!shop) {
            const error = new Error('User does not have a shop. Please register a shop first.');
            error.statusCode = 403;
            throw error;
        }

        // Get image URLs from Cloudinary if uploaded
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path);
        } else if (req.body.image) {
            images = [req.body.image];
        }

        if (images.length === 0) {
            const error = new Error('Please upload at least one image or provide an image link.');
            error.statusCode = 400;
            throw error;
        }

        // Handle variations
        let parsedSizes = [];
        let parsedColors = [];
        
        if (sizes) {
            parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
        }
        if (colors) {
            parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
        }

        const product = await Product.create({
            shop: shop._id,
            name,
            description,
            content: content || description,
            price,
            category,
            stock,
            image: images[0],
            images,
            sizes: parsedSizes,
            colors: parsedColors
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
        const { q, cat, shop, limit, page = 1 } = req.query;
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

        const limitValue = parseInt(limit) || 0;
        const skipValue = (parseInt(page) - 1) * limitValue;

        let productsQuery = Product.find(query)
            .populate({ path: 'shop', select: 'name username avatar isVerified', model: Shop })
            .sort({ createdAt: -1 });

        // If limit is explicitly -1, don't apply any limit
        if (limitValue > 0) {
            productsQuery = productsQuery.limit(limitValue).skip(skipValue);
        } else if (limitValue === -1) {
            // No limit applied
        } else {
            // Default limit if not provided or 0
            productsQuery = productsQuery.limit(100).skip(skipValue);
        }

        const products = await productsQuery;

        res.status(200).json({
            success: true,
            data: products,
            pagination: limitValue > 0 ? {
                total: await Product.countDocuments(query),
                page: parseInt(page),
                limit: limitValue
            } : (limitValue === -1 ? {
                total: products.length,
                page: 1,
                limit: products.length
            } : undefined)
        });
    } catch (error) {
        next(error);
    }
};

export const getProductsByShopId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit, page = 1 } = req.query;
        
        const limitValue = parseInt(limit) || 0;
        const skipValue = (parseInt(page) - 1) * limitValue;

        let queryBuilder = Product.find({ shop: id })
            .populate({ path: 'shop', select: 'name username avatar isVerified', model: Shop })
            .sort({ createdAt: -1 });

        // If limit is explicitly -1, don't apply any limit
        if (limitValue > 0) {
            queryBuilder = queryBuilder.limit(limitValue).skip(skipValue);
        } else if (limitValue === -1) {
            // No limit applied
        } else {
            // Default limit if not provided or 0
            queryBuilder = queryBuilder.limit(100).skip(skipValue);
        }

        const products = await queryBuilder;

        res.status(200).json({
            success: true,
            data: products,
            pagination: limitValue > 0 ? {
                total: await Product.countDocuments({ shop: id }),
                page: parseInt(page),
                limit: limitValue
            } : (limitValue === -1 ? {
                total: products.length,
                page: 1,
                limit: products.length
            } : undefined)
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
        
        // Handle variations
        if (req.body.sizes) {
            try {
                updates.sizes = typeof req.body.sizes === 'string' ? JSON.parse(req.body.sizes) : req.body.sizes;
            } catch (e) {
                console.error("Error parsing sizes:", e);
            }
        }
        if (req.body.colors) {
            try {
                updates.colors = typeof req.body.colors === 'string' ? JSON.parse(req.body.colors) : req.body.colors;
            } catch (e) {
                console.error("Error parsing colors:", e);
            }
        }
        
        // Handle images
        let currentImages = [];
        
        // Add existing images that were kept
        if (req.body.existingImages) {
            try {
                const existing = JSON.parse(req.body.existingImages);
                if (Array.isArray(existing)) {
                    currentImages = [...existing];
                }
            } catch (e) {
                console.error("Error parsing existingImages:", e);
            }
        }

        // Add new uploaded images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.path);
            currentImages = [...currentImages, ...newImages];
        }

        // Limit to 3 images
        currentImages = currentImages.slice(0, 3);

        if (currentImages.length > 0) {
            updates.images = currentImages;
            updates.image = currentImages[0];
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
