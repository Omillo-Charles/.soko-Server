import { Prisma } from '../generated/prisma/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const errorMiddleware = (err, req, res, next) => {
    try {
        let statusCode = err.statusCode || 500;
        let message = err.message || 'An unexpected error occurred';
        let status = err.status || 'error';
        let errors = err.errors || null;

        // Categorize Prisma Errors
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            status = 'fail';
            switch (err.code) {
                case 'P2002': // Unique constraint violation
                    statusCode = 400;
                    const target = err.meta?.target || 'field';
                    const fieldName = Array.isArray(target) ? target[0] : target;
                    
                    // User-friendly messages for common fields
                    if (fieldName.includes('email')) {
                        message = 'This email address is already registered. Please use a different email or try logging in.';
                    } else if (fieldName.includes('username')) {
                        message = 'This username is already taken. Please choose a different username.';
                    } else if (fieldName.includes('phone')) {
                        message = 'This phone number is already registered.';
                    } else {
                        message = `This ${fieldName} is already in use. Please use a different value.`;
                    }
                    break;
                case 'P2025': // Not found
                    statusCode = 404;
                    message = 'The requested item was not found. It may have been deleted or moved.';
                    break;
                case 'P2003': // Foreign key constraint violation
                    statusCode = 400;
                    message = 'Invalid reference. Please ensure all related items exist.';
                    break;
                default:
                    statusCode = 500;
                    message = 'A database error occurred. Please try again later.';
            }
        } else if (err instanceof Prisma.PrismaClientValidationError) {
            statusCode = 400;
            status = 'fail';
            message = 'Invalid details provided. Please check your input and try again.';
        } else if (err instanceof Prisma.PrismaClientInitializationError) {
            statusCode = 503;
            message = 'Service temporarily unavailable. Please try again in a few moments.';
        }

        // Handle Zod Validation Errors
        if (err.name === 'ZodError') {
            statusCode = 400;
            status = 'fail';
            
            // Extract validation errors
            const validationErrors = err.errors && Array.isArray(err.errors) ? err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            })) : [];

            // Create user-friendly message
            if (validationErrors.length > 0) {
                // Get the first error for the main message
                const firstError = validationErrors[0];
                message = firstError.message;
                
                // If multiple errors, provide them in the errors array
                if (validationErrors.length > 1) {
                    errors = validationErrors;
                }
            } else {
                message = 'Invalid details provided. Please check your input and try again.';
            }
        }

        // Handle JWT Errors
        if (err.name === 'JsonWebTokenError') {
            statusCode = 401;
            status = 'fail';
            message = 'Invalid token. Please log in again.';
        } else if (err.name === 'TokenExpiredError') {
            statusCode = 401;
            status = 'fail';
            message = 'Your session has expired. Please log in again.';
        }

        // Log the error with full context
        logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${err.name}: ${err.message}`, {
            requestId: req.requestId || req.headers['x-request-id'],
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            errors,
            statusCode
        });

        // Build user-friendly response
        const response = {
            success: false,
            message: message,
        };

        // Add validation errors if present (for forms to show field-specific errors)
        if (errors && Array.isArray(errors) && errors.length > 0) {
            response.errors = errors;
        }

        // Add request ID for support/debugging
        if (req.requestId) {
            response.requestId = req.requestId;
        }

        // Only include technical details in development
        if (process.env.NODE_ENV === 'development') {
            response.status = status;
            response.stack = err.stack;
            response.details = err;
        }

        return res.status(statusCode).json(response);
    } catch (fatalError) {
        // Fallback for when the error middleware itself fails
        console.error('CRITICAL: Error in error middleware:', fatalError);
        return res.status(500).json({
            success: false,
            message: 'A critical server error occurred'
        });
    }
};

export default errorMiddleware;

