import axios from 'axios';
import bcrypt from 'bcryptjs';
import User from '../models/user/user.js';
import Admin from '../models/admin/admin.js';
import { Wallet } from '../models/wallet/wallet.js';
import { generateUserToken } from '../utils/jwt.js';
import { sendOtpViaMsg91, verifyOtpViaMsg91 } from '../services/msg91Service.js';
import { getClientIp, logActivity } from '../utils/activityLogger.js';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{4,6}$/;
const OTP_DEBUG_STATUS_ENABLED = String(process.env.OTP_DEBUG_STATUS_ENABLED || 'true').toLowerCase() === 'true';
const otpSendAuditMap = new Map();
const MAX_AUDIT_RECORDS = 200;

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').slice(0, 10);

const writeOtpAudit = ({ requestId, phone, status, providerMessage }) => {
    if (!requestId) return;
    if (otpSendAuditMap.size >= MAX_AUDIT_RECORDS) {
        const firstKey = otpSendAuditMap.keys().next().value;
        if (firstKey) otpSendAuditMap.delete(firstKey);
    }
    otpSendAuditMap.set(requestId, {
        requestId,
        phone,
        status,
        providerMessage: providerMessage || null,
        timestamp: new Date().toISOString(),
    });
};

const buildUserPayload = async (userId) => {
    const user = await User.findById(userId).select('username phone email role referredBy createdAt').lean();
    const wallet = await Wallet.findOne({ userId }).select('balance').lean();

    const data = {
        id: user._id,
        username: user.username,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        balance: wallet?.balance ?? 0,
        createdAt: user.createdAt || null,
    };

    if (user.referredBy) {
        data.referredBy = user.referredBy;
        const bookie = await Admin.findById(user.referredBy).select('uiTheme').lean();
        data.bookieTheme = bookie?.uiTheme || { themeId: 'default' };
    }

    return data;
};

const createUserFromOtp = async (phone, req) => {
    const now = new Date();
    const username = `Player${phone.slice(-6)}`;
    const email = `${phone}@otp-user.local`;
    const randomPassword = `${phone}${Date.now()}`;
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const clientIp = getClientIp(req);

    const userDoc = {
        username,
        email,
        password: hashedPassword,
        phone,
        role: 'user',
        balance: 0,
        isActive: true,
        source: 'super_admin',
        referredBy: null,
        lastActiveAt: now,
        lastLoginIp: clientIp || null,
        createdAt: now,
        updatedAt: now,
    };

    try {
        const inserted = await User.collection.insertOne(userDoc);
        await Wallet.collection.insertOne({
            userId: inserted.insertedId,
            balance: 0,
            createdAt: now,
            updatedAt: now,
        });
        return inserted.insertedId;
    } catch (error) {
        if (error.code === 11000) {
            // If a race condition creates the user first, fetch and return it.
            const existing = await User.findOne({ phone }).select('_id').lean();
            if (existing?._id) return existing._id;
        }
        throw error;
    }
};

export const sendOtp = async (req, res) => {
    try {
        const phone = normalizePhone(req.body?.phone);
        if (!INDIAN_MOBILE_REGEX.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number',
            });
        }

        const msg91Response = await sendOtpViaMsg91(phone);
        const requestId = msg91Response?.request_id || msg91Response?.requestId || null;
        writeOtpAudit({
            requestId,
            phone,
            status: String(msg91Response?.type || 'unknown').toLowerCase(),
            providerMessage: msg91Response?.message || null,
        });

        return res.status(200).json({
            success: true,
            message: msg91Response?.message || 'OTP sent successfully',
            data: {
                requestId,
                providerType: msg91Response?.type || null,
            },
        });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 502;
            const providerMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to send OTP';
            writeOtpAudit({
                requestId: error.response?.data?.request_id || error.response?.data?.requestId || null,
                phone,
                status: 'failed',
                providerMessage,
            });
            return res.status(status).json({ success: false, message: providerMessage });
        }
        return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP' });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const phone = normalizePhone(req.body?.phone);
        const otp = String(req.body?.otp || '').trim();

        if (!INDIAN_MOBILE_REGEX.test(phone)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number' });
        }
        if (!OTP_REGEX.test(otp)) {
            return res.status(400).json({ success: false, message: 'Invalid OTP format' });
        }

        const verifyResponse = await verifyOtpViaMsg91(phone, otp);
        const verifyType = String(verifyResponse?.type || '').toLowerCase();
        if (verifyType !== 'success') {
            return res.status(400).json({
                success: false,
                message: verifyResponse?.message || 'OTP verification failed',
            });
        }

        let user = await User.findOne({ phone }).select('_id isActive').lean();
        let isNewUser = false;
        if (!user) {
            const newUserId = await createUserFromOtp(phone, req);
            user = { _id: newUserId, isActive: true };
            isNewUser = true;
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
        }

        await User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date(), lastLoginIp: getClientIp(req) || null } });
        const token = generateUserToken({ id: user._id, phone });
        const data = await buildUserPayload(user._id);

        await logActivity({
            action: isNewUser ? 'player_signup' : 'player_login',
            performedBy: data.username,
            performedByType: 'user',
            targetType: 'user',
            targetId: user._id.toString(),
            details: isNewUser ? `Player "${data.username}" signed up via OTP` : `Player "${data.username}" logged in via OTP`,
            ip: getClientIp(req),
        });

        return res.status(200).json({
            success: true,
            message: isNewUser ? 'OTP verified. User registered successfully' : 'OTP verified. Login successful',
            token,
            data,
        });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 502;
            const providerMessage = error.response?.data?.message || error.response?.data?.error || 'OTP verification failed';
            return res.status(status).json({ success: false, message: providerMessage });
        }
        return res.status(500).json({ success: false, message: error.message || 'OTP verification failed' });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const payload = await buildUserPayload(req.user._id);
        return res.status(200).json({
            success: true,
            message: 'Profile fetched successfully',
            data: payload,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getOtpDebugStatus = async (req, res) => {
    if (!OTP_DEBUG_STATUS_ENABLED) {
        return res.status(404).json({ success: false, message: 'OTP debug status route is disabled' });
    }

    const requestId = String(req.query?.requestId || '').trim();
    const phone = normalizePhone(req.query?.phone);

    if (requestId) {
        const record = otpSendAuditMap.get(requestId);
        if (!record) {
            return res.status(404).json({ success: false, message: 'No OTP audit found for requestId' });
        }
        return res.status(200).json({ success: true, data: record });
    }

    if (phone) {
        const items = Array.from(otpSendAuditMap.values()).filter((item) => item.phone === phone);
        return res.status(200).json({ success: true, data: items.slice(-10).reverse() });
    }

    return res.status(400).json({ success: false, message: 'Pass requestId or phone query param' });
};
