import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";

export const getWishlist = async (req, res, next) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: 'products', model: Product });
        
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        res.status(200).json({
            success: true,
            data: wishlist
        });
    } catch (error) {
        next(error);
    }
};

export const toggleWishlist = async (req, res, next) => {
    try {
        const { productId } = req.body;
        
        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        let wishlist = await Wishlist.findOne({ user: req.user._id });
        
        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        const isIncluded = wishlist.products.some(id => id.toString() === productId.toString());

        if (isIncluded) {
            // Remove if already exists - Use findOneAndUpdate with condition to prevent double decrementing
            const updatedWishlistDoc = await Wishlist.findOneAndUpdate(
                { user: req.user._id, products: productId },
                { $pull: { products: productId } },
                { new: true }
            );

            if (updatedWishlistDoc) {
                // Only decrement if the product was actually removed
                await Product.findByIdAndUpdate(productId, [
                    { $set: { likesCount: { $max: [0, { $subtract: ["$likesCount", 1] }] } } }
                ], { updatePipeline: true });
            }
            
            const finalWishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: 'products', model: Product });
            
            res.status(200).json({
                success: true,
                message: "Removed from wishlist",
                data: finalWishlist,
                action: 'removed'
            });
        } else {
            // Add if not exists - Use findOneAndUpdate with condition to prevent double incrementing
            const updatedWishlistDoc = await Wishlist.findOneAndUpdate(
                { user: req.user._id, products: { $ne: productId } },
                { $addToSet: { products: productId } },
                { new: true }
            );

            if (updatedWishlistDoc) {
                // Only increment if the product was actually added
                await Product.findByIdAndUpdate(productId, { $inc: { likesCount: 1 } });
            }
            
            const finalWishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: 'products', model: Product });
            
            res.status(200).json({
                success: true,
                message: "Added to wishlist",
                data: finalWishlist,
                action: 'added'
            });
        }
    } catch (error) {
        next(error);
    }
};

export const removeFromWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            const error = new Error('Wishlist not found');
            error.statusCode = 404;
            throw error;
        }

        const productIdToRemove = productId.toString();
        const isIncluded = wishlist.products.some(id => id.toString() === productIdToRemove);

        if (isIncluded) {
            await Wishlist.updateOne(
                { user: req.user._id },
                { $pull: { products: productIdToRemove } }
            );

            // Decrement likesCount on product (ensure it doesn't go below 0)
            await Product.findByIdAndUpdate(productIdToRemove, [
                { $set: { likesCount: { $max: [0, { $subtract: ["$likesCount", 1] }] } } }
            ], { updatePipeline: true });
        }

        const updatedWishlist = await Wishlist.findOne({ user: req.user._id }).populate({ path: 'products', model: Product });

        res.status(200).json({
            success: true,
            message: "Removed from wishlist",
            data: updatedWishlist
        });
    } catch (error) {
        next(error);
    }
};
