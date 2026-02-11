import Admin from '../models/admin/admin.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { encrypt, decrypt } from '../utils/encryption.js';

/**
 * Bookie login - only allows users with role 'bookie' and status 'active'
 * Body: { phone, password } or { username, password } (phone preferred; bookies log in with phone + password)
 */
export const bookieLogin = async (req, res) => {
    try {
        const { username, phone, password } = req.body;

        const loginIdentifier = phone || username;
        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone number (or username) and password are required',
            });
        }

        const normalizedPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : '';

        let bookie = normalizedPhone.length >= 10
            ? await Admin.findOne({ phone: normalizedPhone, role: 'bookie' })
            : null;
        if (!bookie && username) {
            bookie = await Admin.findOne({ username: String(username).trim(), role: 'bookie' });
        }
        if (!bookie) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Check if bookie account is active
        if (bookie.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact admin for assistance.',
                code: 'ACCOUNT_SUSPENDED',
            });
        }

        const isPasswordValid = await bookie.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        await logActivity({
            action: 'bookie_login',
            performedBy: bookie.username,
            performedByType: 'bookie',
            targetType: 'admin',
            targetId: bookie._id.toString(),
            details: `Bookie "${bookie.username}" logged in (Bookie Panel)`,
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                id: bookie._id,
                username: bookie.username,
                role: bookie.role,
                email: bookie.email,
                phone: bookie.phone,
                uiTheme: bookie.uiTheme || { themeId: 'default' },
                bookieType: bookie.bookieType || 'admin_collects',
                commissionPercentage: bookie.commissionPercentage || 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bookie heartbeat - checks if account is still active (for auto-logout when suspended)
 * Requires verifyAdmin (bookie Basic Auth)
 */
export const bookieHeartbeat = async (req, res) => {
    try {
        const bookie = req.admin;
        if (!bookie || bookie.role !== 'bookie') {
            return res.status(403).json({ success: false, message: 'Bookie access required', code: 'ACCOUNT_SUSPENDED' });
        }
        if (bookie.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended.',
                code: 'ACCOUNT_SUSPENDED',
            });
        }
        res.status(200).json({ success: true, message: 'OK' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get bookie's referral link - requires bookie auth via verifyAdmin
 * Returns bookieId for frontend to construct URL
 */
export const getReferralLink = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' });
        if (!bookie) {
            return res.status(403).json({
                success: false,
                message: 'Bookie access required',
            });
        }
        res.status(200).json({
            success: true,
            data: {
                bookieId: bookie._id,
                username: bookie.username,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get bookie profile (including uiTheme) - requires bookie auth
 */
export const getProfile = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' })
            .select('-password')
            .lean();
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        res.status(200).json({
            success: true,
            data: {
                id: bookie._id,
                username: bookie.username,
                email: bookie.email,
                phone: bookie.phone,
                role: bookie.role,
                uiTheme: bookie.uiTheme || { themeId: 'default' },
                bookieType: bookie.bookieType || 'admin_collects',
                commissionPercentage: bookie.commissionPercentage || 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update bookie's UI theme (for their users' panel) - requires bookie auth
 * Body: { themeId?, primaryColor?, accentColor? }
 */
export const updateTheme = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' });
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        const { themeId, primaryColor, accentColor } = req.body;
        const validThemeIds = ['default', 'gold', 'blue', 'green', 'red', 'purple'];
        if (!bookie.uiTheme) bookie.uiTheme = { themeId: 'default' };
        if (themeId && validThemeIds.includes(themeId)) bookie.uiTheme.themeId = themeId;
        if (primaryColor !== undefined) bookie.uiTheme.primaryColor = primaryColor ? String(primaryColor).trim() : undefined;
        if (accentColor !== undefined) bookie.uiTheme.accentColor = accentColor ? String(accentColor).trim() : undefined;
        await bookie.save();
        res.status(200).json({
            success: true,
            message: 'Theme updated',
            data: { uiTheme: bookie.uiTheme },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /bookie/upi - Get bookie's UPI ID (decrypted)
 */
export const getBookieUpi = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' }).select('upiId bookieType').lean();
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        const upiId = bookie.upiId ? decrypt(bookie.upiId) : '';
        res.status(200).json({ success: true, data: { upiId, bookieType: bookie.bookieType || 'admin_collects' } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PATCH /bookie/upi - Set/update bookie's UPI ID (only for bookie_collects type)
 * Body: { upiId: string }
 */
export const setBookieUpi = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' });
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        if (bookie.bookieType !== 'bookie_collects') {
            return res.status(400).json({ success: false, message: 'UPI management is only available for "Bookie Collects" type accounts' });
        }
        const { upiId } = req.body;
        const trimmed = (upiId || '').trim();
        bookie.upiId = trimmed ? encrypt(trimmed) : '';
        await bookie.save({ validateBeforeSave: false });

        await logActivity({
            action: 'bookie_update_upi',
            performedBy: bookie.username,
            performedByType: 'bookie',
            targetType: 'admin',
            targetId: bookie._id.toString(),
            details: `Bookie "${bookie.username}" updated their UPI ID`,
            ip: getClientIp(req),
        });

        res.status(200).json({ success: true, message: 'UPI ID updated successfully', data: { upiId: trimmed } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
