import { Prisma } from '@prisma/client';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const errorMiddleware = (err, req, res, next) => {
    try {
        let statusCode = err.statusCode || 500;
        let message = err.message || 'Server Error';
        let status = err.status || 'error';

        // Log the error using winston
        logger.error(`${err.name}: ${err.message}`, {
            url: req.originalUrl,
            method: req.method,
            stack: err.stack,
            statusCode
        });

        // Prisma error handling
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
        } else if (isInitErr) {
            message = 'Database connection error';
            statusCode = 503;
        } else if (isValidationErr) {
            message = 'Database validation error';
            statusCode = 400;
        }

        // Handle Zod errors (if any, will be added later)
        if (err.name === 'ZodError') {
            statusCode = 400;
            message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        }

        res.status(statusCode).json({
            success: false,
            status: status,
            message: message,
            // Only send stack trace in development
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } catch (error) {
        next(error);
    }
};

export default errorMiddleware;
