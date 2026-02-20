import rateLimit from 'express-rate-limit';

/**
 * Stricter rate limit for login/signup endpoints - prevents brute force
 * 10 requests per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limit - prevents abuse and DDoS
 * 300 requests per minute per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    message: { success: false, message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
