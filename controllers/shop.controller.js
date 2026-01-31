import mongoose from "mongoose";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import Wishlist from "../models/wishlist.model.js";
import Rating from "../models/rating.model.js";

export const createShop = async (req, res, next) => {
    try {
        const { name, username, description, category, address, phone, email } = req.body;
        
        // Check if user already has a shop
        const existingShop = await Shop.findOne({ owner: req.user._id });
        if (existingShop) {
            const error = new Error('User already has a shop');
            error.statusCode = 400;
            throw error;
        }

        // Check if username is taken
        if (username) {
            const existingUsername = await Shop.findOne({ username: username.toLowerCase() });
            if (existingUsername) {
                const error = new Error('Username is already taken');
                error.statusCode = 400;
                throw error;
            }
        }

        const shop = await Shop.create({
            owner: req.user._id,
            name,
            username,
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
        if (!shop) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        const productsCount = await Product.countDocuments({ shop: shop._id });
        const followersCount = shop.followers ? shop.followers.length : (shop.followersCount || 0);
        const followingCount = await Shop.countDocuments({ followers: shop.owner });

        res.status(200).json({
            success: true,
            data: {
                ...shop.toObject(),
                productsCount,
                followersCount,
                followingCount,
                rating: shop.rating || 0,
                reviewsCount: shop.reviewsCount || 0
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getShops = async (req, res, next) => {
    try {
        const shops = await Shop.find().limit(20);
        
        const shopsWithCounts = await Promise.all(shops.map(async (shop) => {
            const productsCount = await Product.countDocuments({ shop: shop._id });
            const followersCount = shop.followers ? shop.followers.length : (shop.followersCount || 0);
            const followingCount = await Shop.countDocuments({ followers: shop.owner });
            
            return {
                ...shop.toObject(),
                productsCount,
                followersCount,
                followingCount,
                rating: shop.rating || 0,
                reviewsCount: shop.reviewsCount || 0
            };
        }));

        res.status(200).json({
            success: true,
            data: shopsWithCounts
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

        const productsCount = await Product.countDocuments({ shop: shop._id });
        const followersCount = shop.followers ? shop.followers.length : (shop.followersCount || 0);
        const followingCount = await Shop.countDocuments({ followers: shop.owner });

        res.status(200).json({
            success: true,
            data: {
                ...shop.toObject(),
                productsCount,
                followersCount,
                followingCount,
                rating: shop.rating || 0,
                reviewsCount: shop.reviewsCount || 0
            }
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
        const updateFields = ['name', 'username', 'description', 'category', 'address', 'phone', 'email'];
        
        // If username is being updated, check if it's already taken by another shop
        if (req.body.username && req.body.username !== shop.username) {
            const existingShopWithUsername = await Shop.findOne({ username: req.body.username.toLowerCase() });
            if (existingShopWithUsername) {
                const error = new Error('Username is already taken');
                error.statusCode = 400;
                throw error;
            }
        }

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

export const checkUsernameAvailability = async (req, res, next) => {
    try {
        const { username } = req.params;
        if (!username) {
            const error = new Error('Username is required');
            error.statusCode = 400;
            throw error;
        }

        const shop = await Shop.findOne({ username: username.toLowerCase() });
        
        res.status(200).json({
            success: true,
            available: !shop
        });
    } catch (error) {
        next(error);
    }
};

export const toggleFollowShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const shop = await Shop.findById(id);
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        // Prevent users from following their own shop
        if (shop.owner.toString() === userId.toString()) {
            const error = new Error('You cannot follow your own shop');
            error.statusCode = 400;
            throw error;
        }

        const isFollowing = shop.followers.includes(userId);

        if (isFollowing) {
            // Unfollow
            shop.followers = shop.followers.filter(f => f.toString() !== userId.toString());
        } else {
            // Follow
            shop.followers.push(userId);
        }

        shop.followersCount = shop.followers.length;

        await shop.save();

        res.status(200).json({
            success: true,
            message: isFollowing ? "Unfollowed shop successfully" : "Followed shop successfully",
            isFollowing: !isFollowing,
            followersCount: shop.followersCount
        });
    } catch (error) {
        next(error);
    }
};

export const getShopFollowers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await Shop.findById(id).populate({
            path: 'followers',
            select: 'name email avatar',
            model: 'User'
        });

        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: shop.followers
        });
    } catch (error) {
        next(error);
    }
};

export const getShopFollowing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await Shop.findById(id);
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        // Find shops where this shop's owner is in the followers array
        const following = await Shop.find({ followers: shop.owner })
            .select('name avatar description username isVerified');

        res.status(200).json({
            success: true,
            data: following
        });
    } catch (error) {
        next(error);
    }
};

export const getShopReviews = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid shop ID');
            error.statusCode = 400;
            throw error;
        }

        const reviews = await Rating.find({ shop: new mongoose.Types.ObjectId(id) })
            .populate({
                path: 'user',
                model: User,
                select: 'name avatar username'
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error) {
        next(error);
    }
};

export const rateShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        if (!rating || rating < 1 || rating > 5) {
            const error = new Error('Please provide a rating between 1 and 5');
            error.statusCode = 400;
            throw error;
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid shop ID');
            error.statusCode = 400;
            throw error;
        }

        const shop = await Shop.findById(id);
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if user is the owner
        if (shop.owner.toString() === userId.toString()) {
            const error = new Error('You cannot rate your own shop');
            error.statusCode = 400;
            throw error;
        }

        // Find or create rating
        let userRating = await Rating.findOne({ 
            shop: new mongoose.Types.ObjectId(id), 
            user: userId 
        });
        
        if (userRating) {
            userRating.rating = rating;
            userRating.comment = comment;
            await userRating.save();
        } else {
            await Rating.create({
                shop: new mongoose.Types.ObjectId(id),
                user: userId,
                rating,
                comment
            });
        }

        // Calculate new average rating
        const allRatings = await Rating.find({ shop: new mongoose.Types.ObjectId(id) });
        const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = totalRating / allRatings.length;

        // Update shop rating and reviews count
        shop.rating = averageRating;
        shop.reviewsCount = allRatings.length;
        await shop.save();

        res.status(200).json({
            success: true,
            message: "Shop rated successfully",
            data: {
                rating: shop.rating,
                reviewsCount: shop.reviewsCount
            }
        });
    } catch (error) {
        next(error);
    }
};
