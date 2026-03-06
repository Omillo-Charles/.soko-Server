import prisma from "../database/postgresql.js";

export const createComment = async (req, res, next) => {
    try {
        const { productId, content } = req.body;
        const userId = req.user?.id || req.user?._id?.toString();

        if (!content) {
            const error = new Error('Please provide comment content');
            error.statusCode = 400;
            throw error;
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const comment = await prisma.comment.create({
            data: { productId, userId, content },
            include: { user: { select: { name: true, email: true } } }
        });

        await prisma.product.update({
            where: { id: productId },
            data: { commentsCount: (product.commentsCount || 0) + 1 }
        });

        const populatedComment = comment;

        res.status(201).json({
            success: true,
            message: "Comment posted successfully",
            data: populatedComment
        });
    } catch (error) {
        next(error);
    }
};

export const getProductComments = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const comments = await prisma.comment.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        });

        res.status(200).json({
            success: true,
            data: comments
        });
    } catch (error) {
        next(error);
    }
};

export const deleteComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?._id?.toString();

        const comment = await prisma.comment.findUnique({ where: { id } });
        if (!comment) {
            const error = new Error('Comment not found');
            error.statusCode = 404;
            throw error;
        }

        if (comment.userId !== userId) {
            const error = new Error('Unauthorized to delete this comment');
            error.statusCode = 403;
            throw error;
        }

        await prisma.comment.delete({ where: { id } });

        const product = await prisma.product.findUnique({ where: { id: comment.productId } });
        if (product) {
            await prisma.product.update({
                where: { id: product.id },
                data: { commentsCount: Math.max(0, (product.commentsCount || 0) - 1) }
            });
        }

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
