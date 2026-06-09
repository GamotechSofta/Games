import Admin from '../models/admin/admin.js';
import { verifyToken } from '../utils/jwt.js';
import { adminHasTelecallerAccess } from '../utils/telecallerAccess.js';
import { checkSpecificAdminAccess } from './specificAdminTabs.js';

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
 * Middleware to verify admin/bookie authentication via Bearer JWT.
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
                    const tabCheck = checkSpecificAdminAccess(req);
                    if (!tabCheck.allowed) {
                        return res.status(403).json({
                            success: false,
                            message: tabCheck.message || 'Access denied',
                        });
                    }
                    return next();
                }

                const admin = await Admin.findById(decoded.id)
                    .select('username role bookieType commissionPercentage status uiTheme allowedTabs')
                    .lean();
                if (admin) {
                    adminJwtCache.set(cacheKey, { admin, at: Date.now() });
                    req.admin = admin;
                    const tabCheck = checkSpecificAdminAccess(req);
                    if (!tabCheck.allowed) {
                        return res.status(403).json({
                            success: false,
                            message: tabCheck.message || 'Access denied',
                        });
                    }
                    return next();
                }
            }
        }

        return res.status(401).json({
            success: false,
            message: 'Admin authentication required',
        });
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
