import prisma from "../database/postgresql.js";

export const getCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id?.toString();
        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: true } } }
        });
        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: { include: { product: true } } }
            });
        }

        res.status(200).json({
            success: true,
            data: cart
        });
    } catch (error) {
        next(error);
    }
};

export const addToCart = async (req, res, next) => {
    try {
        const { productId, quantity, size, color, image } = req.body;
        const userId = req.user?.id || req.user?._id?.toString();
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }
        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            cart = await prisma.cart.create({ data: { userId } });
        }
        const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
        const existing = items.find(i =>
            i.productId === productId &&
            i.size === (size || null) &&
            i.color === (color || null) &&
            i.image === (image || product.image || null)
        );
        if (existing) {
            await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + (quantity || 1) }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId,
                    quantity: quantity || 1,
                    size,
                    color,
                    image: image || product.image
                }
            });
        }
        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { product: true } } }
        });

        res.status(200).json({
            success: true,
            message: "Item added to cart",
            data: updatedCart
        });
    } catch (error) {
        next(error);
    }
};

export const updateCartItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const userId = req.user?.id || req.user?._id?.toString();
        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            const error = new Error('Cart not found');
            error.statusCode = 404;
            throw error;
        }
        const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
        if (!item || item.cartId !== cart.id) {
            const error = new Error('Item not found in cart');
            error.statusCode = 404;
            throw error;
        }
        await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { product: true } } }
        });

        res.status(200).json({
            success: true,
            message: "Cart updated",
            data: updatedCart
        });
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const userId = req.user?.id || req.user?._id?.toString();
        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            const error = new Error('Cart not found');
            error.statusCode = 404;
            throw error;
        }
        const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
        if (item && item.cartId === cart.id) {
            await prisma.cartItem.delete({ where: { id: itemId } });
        }
        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { product: true } } }
        });

        res.status(200).json({
            success: true,
            message: "Item removed from cart",
            data: updatedCart
        });
    } catch (error) {
        next(error);
    }
};

export const clearCart = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id?.toString();
        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (cart) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        }

        res.status(200).json({
            success: true,
            message: "Cart cleared"
        });
    } catch (error) {
        next(error);
    }
};
