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

        const followingCount = await Shop.countDocuments({ followers: user._id });
        const userWithFollowing = user.toObject();
        userWithFollowing.followingCount = followingCount;

        res.status(200).json({
            success: true,
            data: userWithFollowing
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

        const followingCount = await Shop.countDocuments({ followers: user._id });
        const userWithFollowing = user.toObject();
        userWithFollowing.followingCount = followingCount;

        res.status(200).json({
            success: true,
            data: userWithFollowing
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
            .select('name avatar description username isVerified');

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

export const addAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, type, phone, city, street, isDefault } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        // If this is the first address, make it default anyway
        const shouldBeDefault = user.addresses.length === 0 ? true : isDefault;

        // If setting as default, unset others
        if (shouldBeDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses.push({ name, type, phone, city, street, isDefault: shouldBeDefault });
        await user.save();

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            data: user.addresses[user.addresses.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

export const updateAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { addressId } = req.params;
        const { name, type, phone, city, street, isDefault } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }

        // If setting as default, unset others
        if (isDefault && !address.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        address.name = name || address.name;
        address.type = type || address.type;
        address.phone = phone || address.phone;
        address.city = city || address.city;
        address.street = street || address.street;
        address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Address updated successfully",
            data: address
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { addressId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }

        const wasDefault = address.isDefault;
        user.addresses.pull(addressId);

        // If we deleted the default address and there are others left, make the first one default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Address deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const setDefaultAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { addressId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            const error = new Error('Address not found');
            error.statusCode = 404;
            throw error;
        }

        user.addresses.forEach(addr => {
            addr.isDefault = addr._id.toString() === addressId;
        });

        await user.save();

        res.status(200).json({
            success: true,
            message: "Default address updated",
            data: user.addresses
        });
    } catch (error) {
        next(error);
    }
};
