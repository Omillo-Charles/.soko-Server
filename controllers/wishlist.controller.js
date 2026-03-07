import prisma from "../database/postgresql.js";

export const getWishlist = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id?.toString();
        let wishlist = await prisma.wishlist.findUnique({
            where: { userId },
            include: { products: true }
        });
        if (!wishlist) {
            wishlist = await prisma.wishlist.create({
                data: { userId },
                include: { products: true }
            });
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
        const userId = req.user?.id || req.user?._id?.toString();
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }
        let wishlist = await prisma.wishlist.findUnique({ where: { userId }, include: { products: true } });
        if (!wishlist) {
            wishlist = await prisma.wishlist.create({ data: { userId }, include: { products: true } });
        }
        const isIncluded = wishlist.products.some(p => p.id === productId);
        if (isIncluded) {
            await prisma.wishlist.update({
                where: { id: wishlist.id },
                data: { products: { disconnect: { id: productId } } }
            });
            await prisma.product.update({
                where: { id: productId },
                data: { likesCount: { decrement: 1 } }
            });
            const finalWishlist = await prisma.wishlist.findUnique({ where: { userId }, include: { products: true } });
            res.status(200).json({
                success: true,
                message: "Removed from wishlist",
                data: finalWishlist,
                action: 'removed'
            });
        } else {
            await prisma.wishlist.update({
                where: { id: wishlist.id },
                data: { products: { connect: { id: productId } } }
            });
            await prisma.product.update({
                where: { id: productId },
                data: { likesCount: { increment: 1 } }
            });
            const finalWishlist = await prisma.wishlist.findUnique({ where: { userId }, include: { products: true } });
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
        const userId = req.user?.id || req.user?._id?.toString();
        const wishlist = await prisma.wishlist.findUnique({ where: { userId }, include: { products: true } });
        if (!wishlist) {
            const error = new Error('Wishlist not found');
            error.statusCode = 404;
            throw error;
        }
        const isIncluded = wishlist.products.some(p => p.id === productId);
        if (isIncluded) {
            await prisma.wishlist.update({
                where: { id: wishlist.id },
                data: { products: { disconnect: { id: productId } } }
            });
            await prisma.product.update({
                where: { id: productId },
                data: { likesCount: { decrement: 1 } }
            });
        }
        const updatedWishlist = await prisma.wishlist.findUnique({ where: { userId }, include: { products: true } });

        res.status(200).json({
            success: true,
            message: "Removed from wishlist",
            data: updatedWishlist
        });
    } catch (error) {
        next(error);
    }
};
