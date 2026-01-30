const errorMiddleware = (err, req, res, next) => {
    try {
        let statusCode = err.statusCode || 500;
        let message = err.message || 'Server Error';

        console.error(`[Error Middleware] ${err.name}: ${err.message}`);
        if (err.statusCode) console.error(`Status Code: ${err.statusCode}`);

        // Mongoose bad ObjectId
        if (err.name === 'CastError') {
            message = 'Resource not found';
            statusCode = 404;
        }

        // Mongoose duplicate key
        if (err.code === 11000) {
            message = 'Duplicate field value entered';
            statusCode = 400;
        }

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            message = Object.values(err.errors).map(val => val.message).join(', ');
            statusCode = 400;
        }

        res.status(statusCode).json({
            success: false,
            message: message,
            error: message // Keep error for backward compatibility
        });
    } catch (error) {
        next(error);
    }
};

export default errorMiddleware;
