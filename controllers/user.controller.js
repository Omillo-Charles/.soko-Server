import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Wishlist from "../models/wishlist.model.js";

export const deleteAccount = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // 1. Find if user has a shop
        const shop = await Shop.findOne({ owner: userId });
        
        if (shop) {
            // 2. Find all products belonging to this shop
            const products = await Product.find({ shop: shop._id });
            const productIds = products.map(p => p._id);

            if (productIds.length > 0) {
                // 3. Remove products from all Carts
                await Cart.updateMany(
                    { "items.product": { $in: productIds } },
                    { $pull: { items: { product: { $in: productIds } } } }
                );

                // 4. Remove products from all Wishlists
                await Wishlist.updateMany(
                    { products: { $in: productIds } },
                    { $pull: { products: { $in: productIds } } }
                );

                // 5. Delete all products belonging to the shop
                await Product.deleteMany({ shop: shop._id });
            }

            // 6. Delete the shop
            await Shop.findByIdAndDelete(shop._id);
        }

        // 7. Remove user's own cart and wishlist
        await Cart.findOneAndDelete({ user: userId });
        await Wishlist.findOneAndDelete({ user: userId });

        // 8. Delete the user
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: "Account and all associated data deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
}

export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find();

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

export const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
}

export const getUserFollowing = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Find shops where this user is in the followers array
        const following = await Shop.find({ followers: id })
            .select('name avatar description isVerified');

        res.status(200).json({
            success: true,
            data: following
        });
    } catch (error) {
        next(error);
    }
};

export const getUserFollowers = async (req, res, next) => {
    try {
        // Users don't have followers in this application, only shops do
        res.status(200).json({
            success: true,
            data: []
        });
    } catch (error) {
        next(error);
    }
};

export const updateAccountType = async (req, res, next) => {
    try {
        const { accountType } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { accountType },
            { new: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            message: `Account switched to ${accountType}`,
            data: user
        });
    } catch (error) {
        next(error);
    }
}
