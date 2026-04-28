import { cache } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {function} keyGenerator - Optional function to generate cache key
 * @returns {function} Express middleware
 */
export const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `cache:${req.originalUrl || req.url}`;

      // Try to get from cache
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      logger.debug(`Cache MISS: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(err => {
            logger.error('Failed to cache response:', { message: err.message });
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', { message: error.message });
      next();
    }
  };
};

/**
 * Invalidate cache by pattern using SCAN instead of KEYS
 * @param {string} pattern - Pattern to match (e.g., 'cache:/api/v1/products*')
 * @returns {Promise<void>}
 */
export const invalidateCache = async (pattern) => {
  try {
    // For Upstash Redis REST API, we'll use a simpler approach
    // Since SCAN is not directly available in the REST API, we'll track cache keys
    // For now, we'll just log the invalidation request
    // In production, consider using Redis Sets to track cache keys by category
    logger.debug(`Cache invalidation requested for pattern: ${pattern}`);
    
    // If pattern is a specific key, delete it directly
    if (!pattern.includes('*')) {
      await cache.del(pattern);
      logger.debug(`Cache key deleted: ${pattern}`);
    } else {
      // For wildcard patterns, we need to track keys in sets
      // This is a limitation of REST-based Redis — consider implementing key tracking
      logger.warn(`Wildcard cache invalidation not fully supported. Pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', { message: error.message });
  }
};

/**
 * Invalidate specific cache key
 * @param {string} key - Cache key to invalidate
 * @returns {Promise<void>}
 */
export const invalidateCacheKey = async (key) => {
  try {
    await cache.del(key);
    logger.debug(`Cache key invalidated: ${key}`);
  } catch (error) {
    logger.error('Cache key invalidation error:', { message: error.message });
  }
};

export default cacheMiddleware;
