import crypto from 'crypto';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || '';
const MSG91_BASE_URL = (process.env.MSG91_BASE_URL || 'https://control.msg91.com/api/v5').replace(/\/$/, '');
const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const OTP_DEV_MODE = process.env.OTP_DEV_MODE === 'true';
const OTP_DEV_CODE = process.env.OTP_DEV_CODE || '123456';

const devOtpStore = new Map();

const isMsg91Configured = () => {
    const key = MSG91_AUTH_KEY.trim();
    return Boolean(key && key !== 'your_msg91_auth_key');
};

const useDevOtp = () => OTP_DEV_MODE || !isMsg91Configured();

export const formatMobileForMsg91 = (phone) => {
    const digits = String(phone).replace(/\D/g, '');
    const local = digits.length > 10 ? digits.slice(-10) : digits;
    return `91${local}`;
};

const storeDevOtp = (mobile, otp) => {
    const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
    devOtpStore.set(mobile, { otp, expiresAt });
};

const verifyDevOtp = (mobile, otp) => {
    const entry = devOtpStore.get(mobile);
    if (!entry) return { ok: false, message: 'OTP expired or not found. Please request a new one.' };
    if (Date.now() > entry.expiresAt) {
        devOtpStore.delete(mobile);
        return { ok: false, message: 'OTP expired. Please request a new one.' };
    }
    if (String(otp).trim() !== String(entry.otp)) {
        return { ok: false, message: 'Invalid OTP. Please try again.' };
    }
    devOtpStore.delete(mobile);
    return { ok: true };
};

const generateOtp = () => {
    const max = 10 ** OTP_LENGTH;
    const num = crypto.randomInt(0, max);
    return String(num).padStart(OTP_LENGTH, '0');
};

/**
 * Send OTP via MSG91 SendOTP API (or dev fallback).
 */
export const sendOtp = async (phone) => {
    const mobile = formatMobileForMsg91(phone);

    if (useDevOtp()) {
        const otp = OTP_DEV_MODE ? OTP_DEV_CODE : generateOtp();
        storeDevOtp(mobile, otp);
        console.info(`[OTP dev] ${mobile}: ${otp}`);
        return { ok: true, dev: true };
    }

    const params = new URLSearchParams({
        template_id: MSG91_TEMPLATE_ID,
        mobile,
        otp_length: String(OTP_LENGTH),
        otp_expiry: String(OTP_EXPIRY_MINUTES),
    });
    if (MSG91_SENDER_ID) {
        params.set('sender', MSG91_SENDER_ID);
    }

    const response = await fetch(`${MSG91_BASE_URL}/otp?${params}`, {
        method: 'POST',
        headers: {
            authkey: MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
        },
    });

    const result = await response.json().catch(() => ({}));

    if (result.type === 'success' || response.ok) {
        return { ok: true };
    }

    const message = result.message || result.error || 'Failed to send OTP. Please try again.';
    return { ok: false, message };
};

/**
 * Verify OTP via MSG91 Verify API (or dev fallback).
 */
export const verifyOtp = async (phone, otp) => {
    const mobile = formatMobileForMsg91(phone);
    const trimmedOtp = String(otp).replace(/\D/g, '');

    if (!trimmedOtp || trimmedOtp.length < 4) {
        return { ok: false, message: 'Please enter a valid OTP' };
    }

    if (useDevOtp()) {
        return verifyDevOtp(mobile, trimmedOtp);
    }

    const params = new URLSearchParams({ mobile, otp: trimmedOtp });
    const response = await fetch(`${MSG91_BASE_URL}/otp/verify?${params}`, {
        method: 'GET',
        headers: { authkey: MSG91_AUTH_KEY },
    });

    const result = await response.json().catch(() => ({}));
    const success =
        result.type === 'success' ||
        result.message === 'OTP verified success' ||
        String(result.message || '').toLowerCase().includes('verified');

    if (success) {
        return { ok: true };
    }

    const message = result.message || result.error || 'Invalid or expired OTP';
    return { ok: false, message };
};

/**
 * Resend the same OTP via MSG91 retry API (no-op in dev — OTP unchanged).
 */
export const resendOtp = async (phone, retryType = 'text') => {
    const mobile = formatMobileForMsg91(phone);

    if (useDevOtp()) {
        const entry = devOtpStore.get(mobile);
        if (!entry) {
            return { ok: false, message: 'OTP session expired. Please request a new OTP.' };
        }
        console.info(`[OTP dev resend] ${mobile}: ${entry.otp}`);
        return { ok: true, dev: true };
    }

    const params = new URLSearchParams({ mobile, retrytype: retryType });
    const response = await fetch(`${MSG91_BASE_URL}/otp/retry?${params}`, {
        method: 'GET',
        headers: { authkey: MSG91_AUTH_KEY },
    });

    const result = await response.json().catch(() => ({}));
    if (result.type === 'success' || response.ok) {
        return { ok: true };
    }

    const message = result.message || result.error || 'Failed to resend OTP';
    return { ok: false, message };
};
