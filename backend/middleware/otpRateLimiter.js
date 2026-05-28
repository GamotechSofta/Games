import rateLimit from 'express-rate-limit';

// Limit OTP send requests to reduce abuse/spam attempts.
export const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP requests. Please try again after some time.',
    },
});

// Limit OTP verify attempts to reduce brute-force attacks.
export const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP verification attempts. Please try again later.',
    },
});
