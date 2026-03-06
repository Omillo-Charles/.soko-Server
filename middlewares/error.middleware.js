import { Prisma } from '@prisma/client';

const errorMiddleware = (err, req, res, next) => {
    try {
        let statusCode = err.statusCode || 500;
        let message = err.message || 'Server Error';

        console.error(`[Error Middleware] ${err.name}: ${err.message}`);
        if (err.statusCode) console.error(`Status Code: ${err.statusCode}`);

        // Prisma error handling (guard against missing classes or non-object RHS)
        const KnownReqErr = Prisma?.PrismaClientKnownRequestError;
        const InitErr = Prisma?.PrismaClientInitializationError;
        const ValidationErr = Prisma?.PrismaClientValidationError;

        const isKnownReqErr = typeof KnownReqErr === 'function' && err instanceof KnownReqErr;
        const isInitErr = typeof InitErr === 'function' && err instanceof InitErr;
        const isValidationErr = typeof ValidationErr === 'function' && err instanceof ValidationErr;

        if (isKnownReqErr) {
            if (err.code === 'P2002') {
                message = `Duplicate field value entered: ${err.meta?.target || 'unknown field'}`;
                statusCode = 400;
            } else if (err.code === 'P2025') {
                message = 'Resource not found';
                statusCode = 404;
            }
        }

        // Prisma initialization error
        if (isInitErr) {
            message = 'Database connection error';
            statusCode = 503;
        }

        // Prisma validation error
        if (isValidationErr) {
            message = 'Database validation error';
            statusCode = 400;
        }

        // Fallback: infer from code if classes unavailable
        if (!isKnownReqErr && !isInitErr && !isValidationErr && typeof err?.code === 'string') {
            if (err.code === 'P2002') {
                message = `Duplicate field value entered: ${err.meta?.target || 'unknown field'}`;
                statusCode = 400;
            } else if (err.code === 'P2025') {
                message = 'Resource not found';
                statusCode = 404;
            }
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
