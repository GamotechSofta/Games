import rateLimit from 'express-rate-limit';

const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(0, 10);

const OTP_SEND_WINDOW_MS = toPositiveInt(process.env.OTP_SEND_WINDOW_MS, 10 * 60 * 1000);
const OTP_SEND_MAX = toPositiveInt(process.env.OTP_SEND_MAX, 10);
const OTP_VERIFY_WINDOW_MS = toPositiveInt(process.env.OTP_VERIFY_WINDOW_MS, 10 * 60 * 1000);
const OTP_VERIFY_MAX = toPositiveInt(process.env.OTP_VERIFY_MAX, 20);

const keyGenerator = (req) => {
    const phone = normalizePhone(req?.body?.phone);
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
    return `${ip}:${phone || 'no-phone'}`;
};

// Limit OTP send requests to reduce abuse/spam attempts.
export const otpSendLimiter = rateLimit({
    windowMs: OTP_SEND_WINDOW_MS,
    max: OTP_SEND_MAX,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP requests. Please try again after some time.',
    },
});

// Limit OTP verify attempts to reduce brute-force attacks.
export const otpVerifyLimiter = rateLimit({
    windowMs: OTP_VERIFY_WINDOW_MS,
    max: OTP_VERIFY_MAX,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many OTP verification attempts. Please try again later.',
    },
});
