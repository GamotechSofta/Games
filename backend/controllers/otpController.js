import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/user/user.js';
import Admin from '../models/admin/admin.js';
import { Wallet } from '../models/wallet/wallet.js';
import { sendOtp, verifyOtp, resendOtp } from '../services/msg91Service.js';
import { generateUserToken } from '../utils/jwt.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { isMongoTimeoutError, mongoTimeoutResponse } from '../utils/mongoErrors.js';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const DB_QUERY_MS = 12000;

const normalizePhone = (phone) => String(phone).replace(/\D/g, '').slice(0, 10);

const buildUserResponse = async (user) => {
    const wallet = await Wallet.findOne({ userId: user._id || user.id })
        .select('balance')
        .maxTimeMS(DB_QUERY_MS)
        .lean();
    const balance = wallet?.balance ?? 0;

    const data = {
        id: user._id || user.id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        balance,
        walletBalance: balance,
        createdAt: user.createdAt || null,
    };
    if (user.referredBy) {
        data.referredBy = user.referredBy;
    }
    return data;
};

const recordLoginActivity = async (user, req, deviceId) => {
    const clientIp = getClientIp(req);
    const trimmedDeviceId = (deviceId != null && String(deviceId).trim()) ? String(deviceId).trim() : '';
    const now = new Date();
    const update = {
        lastActiveAt: now,
        lastLoginAt: now,
        lastLoginIp: clientIp || undefined,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        ...(trimmedDeviceId ? { lastLoginDeviceId: trimmedDeviceId } : {}),
    };

    if (trimmedDeviceId) {
        const existing = await User.findById(user._id || user.id)
            .select('+loginDevices')
            .maxTimeMS(DB_QUERY_MS)
            .lean();
        const loginDevices = Array.isArray(existing?.loginDevices) ? [...existing.loginDevices] : [];
        const idx = loginDevices.findIndex((d) => String(d.deviceId) === trimmedDeviceId);
        if (idx >= 0) {
            loginDevices[idx] = {
                ...loginDevices[idx],
                lastLoginAt: now,
                ipAddress: clientIp || null,
                userAgent: req.headers['user-agent'] || null,
            };
        } else {
            loginDevices.push({
                deviceId: trimmedDeviceId,
                firstLoginAt: now,
                lastLoginAt: now,
                ipAddress: clientIp || null,
                userAgent: req.headers['user-agent'] || null,
            });
        }
        update.loginDevices = loginDevices;
    }

    await User.updateOne({ _id: user._id || user.id }, { $set: update }).maxTimeMS(DB_QUERY_MS);

    void logActivity({
        action: 'player_login',
        performedBy: user.username,
        performedByType: 'user',
        targetType: 'user',
        targetId: String(user._id || user.id),
        details: `Player "${user.username}" logged in via OTP`,
        ip: clientIp,
    }).catch(() => {});
};

export const sendUserOtp = async (req, res) => {
    try {
        const { phone, purpose = 'login' } = req.body;
        const trimmedPhone = normalizePhone(phone);

        if (!PHONE_REGEX.test(trimmedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number (starting with 6–9)',
            });
        }

        const user = await User.findOne({ phone: trimmedPhone })
            .select('_id isActive isBlocked')
            .maxTimeMS(DB_QUERY_MS)
            .lean();

        if (purpose === 'login') {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'No account found with this phone number. Please sign up.',
                    code: 'USER_NOT_FOUND',
                });
            }
            if (!user.isActive || user.isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been suspended. Please contact admin for assistance.',
                    code: 'ACCOUNT_SUSPENDED',
                });
            }
        } else if (purpose === 'signup') {
            if (user) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this phone number already exists. Please log in.',
                    code: 'USER_EXISTS',
                });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid purpose' });
        }

        const result = await sendOtp(trimmedPhone);
        if (!result.ok) {
            return res.status(502).json({ success: false, message: result.message || 'Failed to send OTP' });
        }

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            ...(result.dev ? { dev: true } : {}),
        });
    } catch (error) {
        if (isMongoTimeoutError(error)) return mongoTimeoutResponse(res);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyUserOtp = async (req, res) => {
    try {
        const {
            phone,
            otp,
            purpose = 'login',
            deviceId,
            firstName,
            lastName,
            referredBy: referredByRaw,
        } = req.body;

        const trimmedPhone = normalizePhone(phone);

        if (!PHONE_REGEX.test(trimmedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number (starting with 6–9)',
            });
        }

        if (!otp) {
            return res.status(400).json({ success: false, message: 'OTP is required' });
        }

        const otpResult = await verifyOtp(trimmedPhone, otp);
        if (!otpResult.ok) {
            return res.status(401).json({ success: false, message: otpResult.message || 'Invalid OTP' });
        }

        if (purpose === 'login') {
            const user = await User.findOne({ phone: trimmedPhone })
                .select('_id username email phone role isActive isBlocked referredBy createdAt')
                .maxTimeMS(DB_QUERY_MS)
                .lean();

            if (!user) {
                return res.status(404).json({ success: false, message: 'Account not found', code: 'USER_NOT_FOUND' });
            }
            if (!user.isActive || user.isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been suspended. Please contact admin for assistance.',
                    code: 'ACCOUNT_SUSPENDED',
                });
            }

            await recordLoginActivity(user, req, deviceId);
            const data = await buildUserResponse(user);
            const token = generateUserToken({ id: user._id, phone: user.phone });

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data,
                token,
            });
        }

        if (purpose === 'signup') {
            const existing = await User.findOne({ phone: trimmedPhone }).select('_id').maxTimeMS(DB_QUERY_MS).lean();
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this phone number already exists',
                    code: 'USER_EXISTS',
                });
            }

            const fName = String(firstName || '').trim();
            const lName = String(lastName || '').trim();
            if (!fName || !lName) {
                return res.status(400).json({ success: false, message: 'First name and last name are required' });
            }

            const username = `${fName} ${lName}`.trim();
            const email = `${trimmedPhone}@player.local`;
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            let referredBy = null;
            if (referredByRaw && mongoose.Types.ObjectId.isValid(referredByRaw)) {
                referredBy = new mongoose.Types.ObjectId(referredByRaw);
            }
            const source = referredBy ? 'bookie' : 'super_admin';
            const now = new Date();
            const clientIp = getClientIp(req);
            const trimmedDeviceId = (deviceId != null && String(deviceId).trim()) ? String(deviceId).trim() : '';

            const userDoc = {
                username,
                email,
                password: hashedPassword,
                phone: trimmedPhone,
                role: 'user',
                balance: 0,
                isActive: true,
                source,
                referredBy,
                lastActiveAt: now,
                lastLoginAt: now,
                lastLoginIp: clientIp || null,
                lastLoginDeviceId: trimmedDeviceId || null,
                loginDevices: trimmedDeviceId
                    ? [{ deviceId: trimmedDeviceId, firstLoginAt: now, lastLoginAt: now, ipAddress: clientIp, userAgent: req.headers['user-agent'] }]
                    : [],
                createdAt: now,
                updatedAt: now,
            };

            const insertResult = await User.collection.insertOne(userDoc);
            const userId = insertResult.insertedId;

            await Wallet.collection.insertOne({
                userId,
                balance: 0,
                createdAt: now,
                updatedAt: now,
            });

            await logActivity({
                action: 'player_signup',
                performedBy: username,
                performedByType: 'user',
                targetType: 'user',
                targetId: userId.toString(),
                details: `Player "${username}" signed up via OTP (${source === 'bookie' ? 'via bookie link' : 'direct frontend'})`,
                meta: { email, source },
                ip: clientIp,
            });

            const signupData = {
                id: userId,
                username,
                email,
                phone: trimmedPhone,
                role: 'user',
                balance: 0,
                walletBalance: 0,
                createdAt: now,
            };
            if (referredBy) {
                signupData.referredBy = referredBy;
                const bookie = await Admin.findById(referredBy).select('uiTheme').lean();
                signupData.bookieTheme = bookie?.uiTheme || { themeId: 'default' };
            }

            const token = generateUserToken({ id: userId, phone: trimmedPhone });

            return res.status(201).json({
                success: true,
                message: 'Account created successfully',
                data: signupData,
                token,
            });
        }

        return res.status(400).json({ success: false, message: 'Invalid purpose' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'User with this phone number already exists' });
        }
        if (isMongoTimeoutError(error)) return mongoTimeoutResponse(res);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const resendUserOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        const trimmedPhone = normalizePhone(phone);

        if (!PHONE_REGEX.test(trimmedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number (starting with 6–9)',
            });
        }

        const result = await resendOtp(trimmedPhone);
        if (!result.ok) {
            return res.status(502).json({ success: false, message: result.message || 'Failed to resend OTP' });
        }

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            ...(result.dev ? { dev: true } : {}),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
