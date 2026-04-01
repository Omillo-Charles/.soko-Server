import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

/**
 * Request ID Middleware
 * Generates a unique ID for each request and adds it to:
 * - Response headers (X-Request-ID)
 * - Request object (req.requestId)
 * - Logger context
 * 
 * This enables request tracing across logs and helps with debugging.
 */
const requestIdMiddleware = (req, res, next) => {
    // Generate unique request ID or use existing from header
    const requestId = req.headers['x-request-id'] || randomUUID();
    
    // Attach to request object for use in controllers
    req.requestId = requestId;
    
    // Add to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Log incoming request with ID
    logger.info('Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });
    
    // Track request duration
    const startTime = Date.now();
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });
    
    next();
};

export default requestIdMiddleware;
