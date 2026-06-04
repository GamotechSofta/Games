import Admin from '../models/admin/admin.js';
import { verifyToken } from '../utils/jwt.js';
import { adminHasTelecallerAccess } from '../utils/telecallerAccess.js';

const adminJwtCache = new Map();
const ADMIN_JWT_CACHE_TTL_MS = 30 * 1000;
const ADMIN_JWT_CACHE_MAX_ENTRIES = 500;

function pruneAdminJwtCache(now = Date.now()) {
    for (const [key, value] of adminJwtCache.entries()) {
        if (!value?.at || now - value.at >= ADMIN_JWT_CACHE_TTL_MS) {
            adminJwtCache.delete(key);
        }
    }
    if (adminJwtCache.size <= ADMIN_JWT_CACHE_MAX_ENTRIES) return;
    const entries = [...adminJwtCache.entries()].sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0));
    const overflow = adminJwtCache.size - ADMIN_JWT_CACHE_MAX_ENTRIES;
    for (let i = 0; i < overflow; i += 1) {
        adminJwtCache.delete(entries[i][0]);
    }
}

/**
 * Middleware to verify admin/bookie authentication.
 * Supports:
 * 1. Bearer JWT token (preferred - no password in browser)
 * 2. Basic Auth (fallback - for backward compatibility)
 */
export const verifyAdmin = async (req, res, next) => {
    if (typeof next !== 'function') {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    try {
        const authHeader = req.headers.authorization;

        // 1. Try Bearer token first
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '').trim();
            const decoded = verifyToken(token);
            if (decoded) {
                const cacheKey = String(decoded.id);
                pruneAdminJwtCache();
                const cached = adminJwtCache.get(cacheKey);
                if (cached && Date.now() - cached.at < ADMIN_JWT_CACHE_TTL_MS) {
                    req.admin = cached.admin;
                    return next();
                }

                const admin = await Admin.findById(decoded.id)
                    .select('username role bookieType commissionPercentage status uiTheme')
                    .lean();
                if (admin) {
                    adminJwtCache.set(cacheKey, { admin, at: Date.now() });
                    req.admin = admin;
                    return next();
                }
            }
        }

        // 2. Fallback: Basic Auth
        let username, password;
        if (authHeader && authHeader.startsWith('Basic ')) {
            try {
                const credentials = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('ascii');
                [username, password] = credentials.split(':');
            } catch (err) {
                // Invalid base64
            }
        }
        if (!username || !password) {
            username = req.body?.username;
            password = req.body?.password;
        }
        if (!username || !password) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required',
            });
        }
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials',
            });
        }
        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials',
            });
        }
        req.admin = admin;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Only super_admin can access - use after verifyAdmin */
export const requireSuperAdmin = (req, res, next) => {
    if (req.admin?.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super admin access required',
        });
    }
    next();
};

/** Combined: verifyAdmin + requireSuperAdmin - single middleware to avoid "next is not a function" */
export const verifySuperAdmin = (req, res, next) => {
    const checkRoleAndContinue = () => {
        if (req.admin?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required',
            });
        }
        next();
    };
    verifyAdmin(req, res, checkRoleAndContinue);
};

/** Telecaller panel: super_admin, telecaller role, or specific_admin with player tab */
export const verifyTelecaller = (req, res, next) => {
    const afterAuth = async () => {
        try {
            const role = req.admin?.role;
            const id = req.admin?._id;
            if (!role || !id) {
                return res.status(401).json({ success: false, message: 'Admin authentication required' });
            }
            const allowed = await adminHasTelecallerAccess(id, role);
            if (!allowed) {
                return res.status(403).json({
                    success: false,
                    message: 'Telecaller access not permitted for this account',
                });
            }
            return next();
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };
    verifyAdmin(req, res, afterAuth);
};

/** Only bookie can access - use after verifyAdmin */
export const requireBookie = (req, res, next) => {
    if (req.admin?.role !== 'bookie') {
        return res.status(403).json({
            success: false,
            message: 'Bookie access required',
        });
    }
    next();
};
