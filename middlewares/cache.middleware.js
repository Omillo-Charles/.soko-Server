import { cache } from '../config/redis.js';

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
        console.log(`Cache HIT: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`Cache MISS: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
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
    console.log(`Cache invalidation requested for pattern: ${pattern}`);
    
    // If pattern is a specific key, delete it directly
    if (!pattern.includes('*')) {
      await cache.del(pattern);
      console.log(`Cache key deleted: ${pattern}`);
    } else {
      // For wildcard patterns, we need to track keys in sets
      // This is a limitation of REST-based Redis - consider implementing key tracking
      console.warn(`Wildcard cache invalidation not fully supported. Pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
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
    console.log(`Cache key invalidated: ${key}`);
  } catch (error) {
    console.error('Cache key invalidation error:', error);
  }
};

export default cacheMiddleware;
