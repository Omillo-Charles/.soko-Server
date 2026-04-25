import prisma from "../database/postgresql.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { uploadToImageKit } from "../config/imagekit.js";
import { invalidateCache } from "../middlewares/cache.middleware.js";
import logger from "../utils/logger.js";
import { AppError, NotFoundError, UnauthorizedError, ValidationError } from "../utils/errors.js";

export const createShop = async (req, res, next) => {
    try {
        const { name, username, description, category, address, phone, email } = req.body;
        
        const ownerId = req.user?.id || req.user?._id?.toString();
        const existingShop = await prisma.shop.findUnique({ where: { ownerId } });
        if (existingShop) {
            throw new ValidationError('User already has a shop');
        }

        if (username) {
            const existingUsername = await prisma.shop.findUnique({ where: { username: username.toLowerCase() } });
            if (existingUsername) {
                throw new ValidationError('Username is already taken');
            }
        }

        const data = {
            ownerId,
            name,
            username: username?.toLowerCase() || null,
            description,
            category,
            address,
            phone,
            email
        };

        if (req.files) {
            if (req.files.avatar) {
                console.log("Uploading avatar to ImageKit (Shop Creation)...");
                const result = await uploadToImageKit(req.files.avatar[0], "duuka/avatars");
                data.avatar = result.url;
            }
            if (req.files.banner) {
                console.log("Uploading banner to ImageKit (Shop Creation)...");
                const result = await uploadToImageKit(req.files.banner[0], "duuka/banners");
                data.banner = result.url;
            }
        }

        const shop = await prisma.shop.create({
            data
        });

        // Update user's account type to seller
        await prisma.user.update({
            where: { id: ownerId },
            data: { accountType: 'seller' }
        });

        // Invalidate shop caches
        await invalidateCache("cache:/api/v1/shops*");

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
        const ownerId = req.user?.id || req.user?._id?.toString();
        const shop = await prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        const productsCount = await prisma.product.count({ where: { shopId: shop.id } });
        const followersCount = await prisma.shop.findUnique({
            where: { id: shop.id },
            include: { _count: { select: { followers: true } } }
        }).then(s => s?._count?.followers || 0);
        const followingCount = await prisma.shop.count({ where: { followers: { some: { id: ownerId } } } });

        res.status(200).json({
            success: true,
            data: {
                ...shop,
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

export const getSellerAnalytics = async (req, res, next) => {
    try {
        const ownerId = req.user?.id || req.user?._id?.toString();
        const { period = '30' } = req.query; // days: 7, 30, 90, 365, or 'all'
        
        const shop = await prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found. Please register a shop first."
            });
        }

        // Calculate date range
        let dateFilter = {};
        if (period !== 'all') {
            const days = parseInt(period) || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            dateFilter = { gte: startDate };
        }

        // Get all orders containing shop's products
        const ordersWhere = { 
            items: { some: { shopId: shop.id } },
            ...(period !== 'all' && { createdAt: dateFilter })
        };

        const orders = await prisma.order.findMany({
            where: ordersWhere,
            include: { items: { where: { shopId: shop.id } } }
        });

        // Calculate revenue and order metrics
        let totalRevenue = 0;
        let totalOrders = orders.length;
        let totalItemsSold = 0;
        const statusBreakdown = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        orders.forEach(order => {
            // Sum revenue from this shop's items only
            const shopRevenue = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalRevenue += shopRevenue;
            
            // Count items sold
            totalItemsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);
            
            // Status breakdown
            if (statusBreakdown.hasOwnProperty(order.status)) {
                statusBreakdown[order.status]++;
            }
        });

        // Product performance
        const products = await prisma.product.findMany({
            where: { shopId: shop.id },
            select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                rating: true,
                reviewsCount: true,
                likesCount: true,
                createdAt: true
            }
        });

        // Get top selling products
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        productId: item.productId,
                        name: item.name,
                        quantitySold: 0,
                        revenue: 0
                    };
                }
                productSales[item.productId].quantitySold += item.quantity;
                productSales[item.productId].revenue += item.price * item.quantity;
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Low stock alerts
        const lowStockProducts = products.filter(p => p.stock < 5 && p.stock > 0);
        const outOfStockProducts = products.filter(p => p.stock === 0);

        // Customer metrics
        const uniqueCustomers = new Set(orders.map(o => o.userId)).size;

        // Growth metrics (compare with previous period)
        let previousPeriodRevenue = 0;
        let previousPeriodOrders = 0;
        
        if (period !== 'all') {
            const days = parseInt(period) || 30;
            const previousStartDate = new Date();
            previousStartDate.setDate(previousStartDate.getDate() - (days * 2));
            const previousEndDate = new Date();
            previousEndDate.setDate(previousEndDate.getDate() - days);

            const previousOrders = await prisma.order.findMany({
                where: {
                    items: { some: { shopId: shop.id } },
                    createdAt: { gte: previousStartDate, lt: previousEndDate }
                },
                include: { items: { where: { shopId: shop.id } } }
            });

            previousPeriodOrders = previousOrders.length;
            previousOrders.forEach(order => {
                previousPeriodRevenue += order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            });
        }

        const revenueGrowth = previousPeriodRevenue > 0 
            ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100).toFixed(2)
            : 0;
        
        const ordersGrowth = previousPeriodOrders > 0
            ? ((totalOrders - previousPeriodOrders) / previousPeriodOrders * 100).toFixed(2)
            : 0;

        // Recent activity
        const recentOrders = orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(order => ({
                id: order.id,
                status: order.status,
                total: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                itemsCount: order.items.length,
                createdAt: order.createdAt
            }));

        // Follower growth
        const followersCount = await prisma.shop.findUnique({
            where: { id: shop.id },
            include: { _count: { select: { followers: true } } }
        }).then(s => s?._count?.followers || 0);

        res.status(200).json({
            success: true,
            data: {
                period: period === 'all' ? 'all-time' : `${period} days`,
                overview: {
                    totalRevenue,
                    totalOrders,
                    totalItemsSold,
                    uniqueCustomers,
                    averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
                    followersCount
                },
                growth: {
                    revenueGrowth: parseFloat(revenueGrowth),
                    ordersGrowth: parseFloat(ordersGrowth)
                },
                orders: {
                    statusBreakdown,
                    recentOrders
                },
                products: {
                    total: products.length,
                    topSelling: topProducts,
                    lowStock: lowStockProducts.map(p => ({
                        id: p.id,
                        name: p.name,
                        stock: p.stock
                    })),
                    outOfStock: outOfStockProducts.map(p => ({
                        id: p.id,
                        name: p.name
                    }))
                },
                shop: {
                    rating: shop.rating || 0,
                    reviewsCount: shop.reviewsCount || 0,
                    isVerified: shop.isVerified
                }
            }
        });
    } catch (error) {
        logger.error("Error in getSellerAnalytics:", error);
        next(error);
    }
};

export const getShops = async (req, res, next) => {
    try {
        const { limit, page = 1, category, verified, q, minRating, sortBy = 'newest' } = req.query;
        const limitValue = parseInt(limit) || 20;
        const pageValue = parseInt(page) || 1;
        const skipValue = (pageValue - 1) * limitValue;

        const where = {};
        
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { username: { contains: q, mode: 'insensitive' } }
            ];
        }
        
        if (category && category !== 'all') {
            where.category = category;
        }
        
        if (verified === 'true') {
            where.isVerified = true;
        }
        
        if (minRating) {
            where.rating = { gte: parseFloat(minRating) };
        }

        let orderBy;
        switch (sortBy) {
            case 'rating':
                orderBy = { rating: 'desc' };
                break;
            case 'popular':
                orderBy = { followersCount: 'desc' };
                break;
            case 'products':
                orderBy = { productsCount: 'desc' };
                break;
            case 'oldest':
                orderBy = { createdAt: 'asc' };
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }

        // Fetch shops with essential counts included
        const shops = await prisma.shop.findMany({ 
            where,
            take: limitValue,
            skip: skipValue,
            orderBy,
            include: {
                _count: {
                    select: {
                        followers: true,
                        products: true
                    }
                }
            }
        });

        let userId = null;
        try {
            const auth = req.headers?.authorization;
            if (auth?.startsWith('Bearer ')) {
                const token = auth.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded?.userId || null;
            }
        } catch (e) {
            userId = null;
        }

        // Fetch followed shop IDs in one go to avoid N+1 queries
        let followedShopIds = new Set();
        if (userId) {
            const followed = await prisma.shop.findMany({
                where: { followers: { some: { id: userId } } },
                select: { id: true }
            });
            followedShopIds = new Set(followed.map(s => s.id));
        }
        
        const shopsWithCounts = shops.map((shop) => ({
            ...shop,
            productsCount: shop._count?.products || 0,
            followersCount: shop._count?.followers || 0,
            isFollowing: followedShopIds.has(shop.id)
        }));

        const total = await prisma.shop.count({ where });

        res.status(200).json({
            success: true,
            data: shopsWithCounts,
            pagination: {
                total,
                page: pageValue,
                limit: limitValue,
                pages: Math.ceil(total / limitValue)
            }
        });
    } catch (error) {
        logger.error("Error in getShops:", error);
        next(error);
    }
};

export const getShopById = async (req, res, next) => {
    try {
        if (req.params.id === 'index' || req.params.id === 'create') {
            return res.status(404).json({ success: false, message: 'Invalid shop ID' });
        }
        const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const productsCount = await prisma.product.count({ where: { shopId: shop.id } });
        const followersCount = await prisma.shop.findUnique({
            where: { id: shop.id },
            include: { _count: { select: { followers: true } } }
        }).then(s => s?._count?.followers || 0);
        const followingCount = await prisma.shop.count({ where: { followers: { some: { id: shop.ownerId } } } });
        let isFollowing = false;
        try {
            const auth = req.headers?.authorization;
            if (auth?.startsWith('Bearer ')) {
                const token = auth.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                const userId = decoded?.userId;
                if (userId) {
                    const rel = await prisma.shop.findFirst({ where: { id: shop.id, followers: { some: { id: userId } } }, select: { id: true } });
                    isFollowing = Boolean(rel);
                }
            }
        } catch (e) {
            isFollowing = false;
        }

        res.status(200).json({
            success: true,
            data: {
                ...shop,
                productsCount,
                followersCount,
                followingCount,
                rating: shop.rating || 0,
                reviewsCount: shop.reviewsCount || 0,
                isFollowing
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getShopByHandle = async (req, res, next) => {
    try {
        const { username } = req.params;
        const shop = await prisma.shop.findUnique({ where: { username: username.toLowerCase() } });
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const productsCount = await prisma.product.count({ where: { shopId: shop.id } });
        const followersCount = await prisma.shop.findUnique({
            where: { id: shop.id },
            include: { _count: { select: { followers: true } } }
        }).then(s => s?._count?.followers || 0);
        const followingCount = await prisma.shop.count({ where: { followers: { some: { id: shop.ownerId } } } });
        let isFollowing = false;
        try {
            const auth = req.headers?.authorization;
            if (auth?.startsWith('Bearer ')) {
                const token = auth.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                const userId = decoded?.userId;
                if (userId) {
                    const rel = await prisma.shop.findFirst({ where: { id: shop.id, followers: { some: { id: userId } } }, select: { id: true } });
                    isFollowing = Boolean(rel);
                }
            }
        } catch (e) {
            isFollowing = false;
        }

        res.status(200).json({
            success: true,
            data: {
                ...shop,
                productsCount,
                followersCount,
                followingCount,
                rating: shop.rating || 0,
                reviewsCount: shop.reviewsCount || 0,
                isFollowing
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getShopReviewsByHandle = async (req, res, next) => {
    try {
        const { username } = req.params;
        const { limit, page = 1 } = req.query;
        const limitValue = parseInt(limit) || 20;
        const pageValue = parseInt(page) || 1;
        const skipValue = (pageValue - 1) * limitValue;

        const shop = await prisma.shop.findUnique({ where: { username: username.toLowerCase() } });
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const where = { shopId: shop.id };

        const reviews = await prisma.rating.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } },
            take: limitValue,
            skip: skipValue
        });

        const total = await prisma.rating.count({ where });

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: pageValue,
                limit: limitValue,
                pages: Math.ceil(total / limitValue)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getShopFollowersByHandle = async (req, res, next) => {
    try {
        const { username } = req.params;
        const { limit, page = 1 } = req.query;
        const limitValue = parseInt(limit) || 50;
        const pageValue = parseInt(page) || 1;
        const skipValue = (pageValue - 1) * limitValue;

        const shop = await prisma.shop.findUnique({
            where: { username: username.toLowerCase() },
            include: { 
                followers: { 
                    select: { id: true, name: true, email: true },
                    take: limitValue,
                    skip: skipValue
                },
                _count: { select: { followers: true } }
            }
        });

        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const total = shop._count.followers;

        res.status(200).json({
            success: true,
            data: shop.followers || [],
            pagination: {
                total,
                page: pageValue,
                limit: limitValue,
                pages: Math.ceil(total / limitValue)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getShopFollowingByHandle = async (req, res, next) => {
    try {
        const { username } = req.params;
        const shop = await prisma.shop.findUnique({ where: { username: username.toLowerCase() } });
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const following = await prisma.shop.findMany({
            where: { followers: { some: { id: shop.ownerId } } },
            select: { id: true, name: true, description: true, username: true, isVerified: true, followersCount: true, avatar: true }
        });

        res.status(200).json({
            success: true,
            data: following || []
        });
    } catch (error) {
        next(error);
    }
};

export const updateShop = async (req, res, next) => {
    try {
        console.log("Update Shop Request Received:", {
            body: req.body,
            files: req.files ? Object.keys(req.files) : "No files"
        });

        const ownerId = req.user?.id || req.user?._id?.toString();
        const shop = await prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) {
            console.log("Update Shop Error: Shop not found for owner", ownerId);
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const updateFields = ['name', 'username', 'description', 'category', 'address', 'phone', 'email', 'avatar', 'banner'];
        const data = {};

        // Handle file uploads from multipart/form-data
        if (req.files) {
            if (req.files.avatar) {
                console.log("Uploading avatar to ImageKit...");
                const result = await uploadToImageKit(req.files.avatar[0], "duuka/avatars");
                data.avatar = result.url;
            }
            if (req.files.banner) {
                console.log("Uploading banner to ImageKit...");
                const result = await uploadToImageKit(req.files.banner[0], "duuka/banners");
                data.banner = result.url;
            }
        }
        
        if (req.body.username && req.body.username !== shop.username) {
            console.log("Checking username availability:", req.body.username);
            const existingShopWithUsername = await prisma.shop.findUnique({ where: { username: req.body.username.toLowerCase() } });
            if (existingShopWithUsername) {
                console.log("Username already taken:", req.body.username);
                const error = new Error('Username is already taken');
                error.statusCode = 400;
                throw error;
            }
        }

        // Handle all update fields from request body
        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                // Only update avatar/banner from body if not already set from files
                if ((field === 'avatar' || field === 'banner') && data[field]) {
                    return; // Skip if already set from file upload
                }
                data[field] = field === 'username' ? req.body[field]?.toLowerCase() : req.body[field];
            }
        });

        console.log("Updating shop in database with data:", data);
        const updated = Object.keys(data).length > 0 ? await prisma.shop.update({ where: { id: shop.id }, data }) : shop;

        console.log("Shop updated successfully:", updated.id);
        
        // Invalidate shop caches
        await invalidateCache(`cache:/api/v1/shops/${shop.id}*`);
        await invalidateCache(`cache:/api/v1/shops/handle/${shop.username}*`);
        await invalidateCache("cache:/api/v1/shops?*");
        
        res.status(200).json({
            success: true,
            message: "Shop updated successfully",
            data: updated
        });
    } catch (error) {
        console.error("Update Shop Controller Error:", error);
        next(error);
    }
};

export const deleteShop = async (req, res, next) => {
    try {
        const ownerId = req.user?.id || req.user?._id?.toString();
        const shop = await prisma.shop.findUnique({ where: { ownerId } });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        await prisma.product.deleteMany({ where: { shopId: shop.id } });
        await prisma.shop.delete({ where: { id: shop.id } });

        // Invalidate shop and product caches
        await invalidateCache(`cache:/api/v1/shops/${shop.id}*`);
        await invalidateCache(`cache:/api/v1/shops/handle/${shop.username}*`);
        await invalidateCache("cache:/api/v1/shops*");
        await invalidateCache("cache:/api/v1/products*");

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

        const shop = await prisma.shop.findUnique({ where: { username: username.toLowerCase() } });
        
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
        const userId = req.user?.id || req.user?._id?.toString();

        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        if (shop.ownerId === userId) {
            const error = new Error('You cannot follow your own shop');
            error.statusCode = 400;
            throw error;
        }

        const isFollowing = await prisma.shop.findFirst({
            where: { id, followers: { some: { id: userId } } }
        });

        if (isFollowing) {
            await prisma.shop.update({
                where: { id },
                data: { followers: { disconnect: { id: userId } } }
            });
        } else {
            await prisma.shop.update({
                where: { id },
                data: { followers: { connect: { id: userId } } }
            });
        }

        const updated = await prisma.shop.findUnique({
            where: { id },
            include: { _count: { select: { followers: true } } }
        });

        // Invalidate shop caches after follow/unfollow
        await invalidateCache(`cache:/api/v1/shops/${id}*`);

        res.status(200).json({
            success: true,
            message: isFollowing ? "Unfollowed shop successfully" : "Followed shop successfully",
            isFollowing: !isFollowing,
            followersCount: updated?._count?.followers || 0
        });
    } catch (error) {
        next(error);
    }
};

export const getShopFollowers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit, page = 1 } = req.query;
        const limitValue = parseInt(limit) || 50;
        const pageValue = parseInt(page) || 1;
        const skipValue = (pageValue - 1) * limitValue;

        const shop = await prisma.shop.findUnique({
            where: { id },
            include: { 
                followers: { 
                    select: { id: true, name: true, email: true },
                    take: limitValue,
                    skip: skipValue
                },
                _count: { select: { followers: true } }
            }
        });

        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const total = shop._count.followers;

        res.status(200).json({
            success: true,
            data: shop.followers || [],
            pagination: {
                total,
                page: pageValue,
                limit: limitValue,
                pages: Math.ceil(total / limitValue)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getShopFollowing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await prisma.shop.findUnique({ where: { id } });
        
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        const following = await prisma.shop.findMany({
            where: { followers: { some: { id: shop.ownerId } } },
            select: { id: true, name: true, description: true, username: true, isVerified: true, followersCount: true, avatar: true }
        });

        res.status(200).json({
            success: true,
            data: following || []
        });
    } catch (error) {
        next(error);
    }
};

export const getShopReviews = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit, page = 1 } = req.query;
        const limitValue = parseInt(limit) || 20;
        const pageValue = parseInt(page) || 1;
        const skipValue = (pageValue - 1) * limitValue;

        const where = { shopId: id };

        const reviews = await prisma.rating.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } },
            take: limitValue,
            skip: skipValue
        });

        const total = await prisma.rating.count({ where });

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: pageValue,
                limit: limitValue,
                pages: Math.ceil(total / limitValue)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const rateShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user?.id || req.user?._id?.toString();

        if (!rating || rating < 1 || rating > 5) {
            const error = new Error('Please provide a rating between 1 and 5');
            error.statusCode = 400;
            throw error;
        }

        const shop = await prisma.shop.findUnique({ where: { id } });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }

        if (shop.ownerId === userId) {
            const error = new Error('You cannot rate your own shop');
            error.statusCode = 400;
            throw error;
        }

        await prisma.rating.upsert({
            where: { unique_shop_user_rating: { shopId: id, userId } },
            update: { rating, comment },
            create: { shopId: id, userId, rating, comment }
        });

        const agg = await prisma.rating.aggregate({
            where: { shopId: id },
            _avg: { rating: true },
            _count: { rating: true }
        });
        const averageRating = agg._avg.rating || 0;
        const reviewsCount = agg._count.rating || 0;

        await prisma.shop.update({
            where: { id },
            data: { rating: averageRating, reviewsCount }
        });

        // Invalidate shop cache after rating
        await invalidateCache(`cache:/api/v1/shops/${id}*`);

        res.status(200).json({
            success: true,
            message: "Shop rated successfully",
            data: {
                rating: averageRating,
                reviewsCount
            }
        });
    } catch (error) {
        next(error);
    }
};

export const rateShopByHandle = async (req, res, next) => {
    try {
        const { username } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user?.id || req.user?._id?.toString();
        if (!rating || rating < 1 || rating > 5) {
            const error = new Error('Please provide a rating between 1 and 5');
            error.statusCode = 400;
            throw error;
        }
        const shop = await prisma.shop.findUnique({ where: { username: username.toLowerCase() } });
        if (!shop) {
            const error = new Error('Shop not found');
            error.statusCode = 404;
            throw error;
        }
        if (shop.ownerId === userId) {
            const error = new Error('You cannot rate your own shop');
            error.statusCode = 400;
            throw error;
        }
        await prisma.rating.upsert({
            where: { unique_shop_user_rating: { shopId: shop.id, userId } },
            update: { rating, comment },
            create: { shopId: shop.id, userId, rating, comment }
        });
        const agg = await prisma.rating.aggregate({
            where: { shopId: shop.id },
            _avg: { rating: true },
            _count: { rating: true }
        });
        const averageRating = agg._avg.rating || 0;
        const reviewsCount = agg._count.rating || 0;
        await prisma.shop.update({
            where: { id: shop.id },
            data: { rating: averageRating, reviewsCount }
        });

        // Invalidate shop cache after rating
        await invalidateCache(`cache:/api/v1/shops/${shop.id}*`);
        await invalidateCache(`cache:/api/v1/shops/handle/${username}*`);

        res.status(200).json({
            success: true,
            message: "Shop rated successfully",
            data: {
                rating: averageRating,
                reviewsCount
            }
        });
    } catch (error) {
        next(error);
    }
};
