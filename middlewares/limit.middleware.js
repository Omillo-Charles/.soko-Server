import { cache } from '../config/redis.js';

/**
 * Creates a Redis-backed fixed-window rate limiter middleware.
 * Shared across all server instances via Upstash Redis.
 * Fails open (allows request) if Redis is unavailable to avoid outages.
 */
const createRedisLimiter = ({ windowMs, max, message, prefix = 'rl:' }) => {
    const windowSecs = Math.ceil(windowMs / 1000);

    return async (req, res, next) => {
        // Bucket key per IP per time window
        const windowKey = Math.floor(Date.now() / windowMs);
        const key = `${prefix}${req.ip}:${windowKey}`;

        try {
            const hits = await cache.incr(key);

            // Set TTL on first hit so key auto-expires
            if (hits === 1) {
                await cache.expire(key, windowSecs);
            }

            // Standard rate limit response headers
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', Math.max(0, max - hits));
            res.setHeader('RateLimit-Reset', Math.ceil(((windowKey + 1) * windowMs) / 1000));

            if (hits > max) {
                return res.status(429).json(message);
            }

            next();
        } catch (error) {
            // Fail open — if Redis is down, don't block requests
            next();
        }
    };
};

const limiter = createRedisLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    prefix: 'rl:global:',
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

export const authLimiter = createRedisLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Strict limit for auth routes — shared across all instances
    prefix: 'rl:auth:',
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    }
});

export const createLimiter = createRedisLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    prefix: 'rl:create:',
    message: {
        success: false,
        message: 'Too many creation requests, please try again after an hour'
    }
});

export const commentLimiter = createRedisLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    prefix: 'rl:comment:',
    message: {
        success: false,
        message: 'Too many comments, please try again after an hour'
    }
});

export default limiter;
