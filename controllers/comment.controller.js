import Comment from "../models/comment.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

export const createComment = async (req, res, next) => {
    try {
        const { productId, content } = req.body;
        const userId = req.user._id;

        if (!content) {
            const error = new Error('Please provide comment content');
            error.statusCode = 400;
            throw error;
        }

        const product = await Product.findById(productId);
        if (!product) {
            const error = new Error('Product not found');
            error.statusCode = 404;
            throw error;
        }

        const comment = await Comment.create({
            product: productId,
            user: userId,
            content
        });

        // Update product commentsCount
        product.commentsCount = (product.commentsCount || 0) + 1;
        await product.save();

        // Populate user info for the response
        const populatedComment = await Comment.findById(comment._id).populate({
            path: 'user',
            select: 'name avatar',
            model: User
        });

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
        
        const comments = await Comment.find({ product: productId })
            .populate({
                path: 'user',
                select: 'name avatar',
                model: User
            })
            .sort({ createdAt: -1 });

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
        const userId = req.user._id;

        const comment = await Comment.findById(id);
        if (!comment) {
            const error = new Error('Comment not found');
            error.statusCode = 404;
            throw error;
        }

        // Only the author can delete their comment
        if (comment.user.toString() !== userId.toString()) {
            const error = new Error('Unauthorized to delete this comment');
            error.statusCode = 403;
            throw error;
        }

        await Comment.findByIdAndDelete(id);

        // Update product commentsCount
        const product = await Product.findById(comment.product);
        if (product) {
            product.commentsCount = Math.max(0, (product.commentsCount || 0) - 1);
            await product.save();
        }

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
