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

        let wishlist = await prisma.wishlist.findUnique({ 
            where: { userId }, 
            include: { products: { select: { id: true } } } 
        });

        if (!wishlist) {
            wishlist = await prisma.wishlist.create({ 
                data: { userId }, 
                include: { products: { select: { id: true } } } 
            });
        }

        const isCurrentlyIncluded = wishlist.products.some(p => p.id === productId);
        const action = isCurrentlyIncluded ? 'removed' : 'added';

        // Use transaction for atomic updates
        const [updatedProduct, updatedWishlist] = await prisma.$transaction([
            prisma.product.update({
                where: { id: productId },
                data: { 
                    likesCount: action === 'added' 
                        ? { increment: 1 } 
                        : { decrement: 1 }
                }
            }),
            prisma.wishlist.update({
                where: { id: wishlist.id },
                data: { 
                    products: action === 'added' 
                        ? { connect: { id: productId } } 
                        : { disconnect: { id: productId } }
                },
                include: { products: true }
            })
        ]);

        // Safety check for negative likesCount (shouldn't happen with correct logic, but good for robustness)
        if (updatedProduct.likesCount < 0) {
            await prisma.product.update({
                where: { id: productId },
                data: { likesCount: 0 }
            });
            updatedProduct.likesCount = 0;
        }

        res.status(200).json({
            success: true,
            message: action === 'added' ? "Added to wishlist" : "Removed from wishlist",
            data: updatedWishlist,
            action,
            likesCount: updatedProduct.likesCount
        });
    } catch (error) {
        next(error);
    }
};

export const removeFromWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const userId = req.user?.id || req.user?._id?.toString();

        const wishlist = await prisma.wishlist.findUnique({ 
            where: { userId }, 
            include: { products: { select: { id: true } } } 
        });

        if (!wishlist) {
            const error = new Error('Wishlist not found');
            error.statusCode = 404;
            throw error;
        }

        const isIncluded = wishlist.products.some(p => p.id === productId);
        
        let updatedWishlist = wishlist;
        if (isIncluded) {
            const [updatedProduct, result] = await prisma.$transaction([
                prisma.product.update({
                    where: { id: productId },
                    data: { likesCount: { decrement: 1 } }
                }),
                prisma.wishlist.update({
                    where: { id: wishlist.id },
                    data: { products: { disconnect: { id: productId } } },
                    include: { products: true }
                })
            ]);
            
            updatedWishlist = result;

            if (updatedProduct.likesCount < 0) {
                await prisma.product.update({
                    where: { id: productId },
                    data: { likesCount: 0 }
                });
            }
        }

        res.status(200).json({
            success: true,
            message: "Removed from wishlist",
            data: updatedWishlist
        });
    } catch (error) {
        next(error);
    }
};
