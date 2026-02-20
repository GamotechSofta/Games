import Admin from '../models/admin/admin.js';
import { verifyToken } from '../utils/jwt.js';

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
                const admin = await Admin.findById(decoded.id);
                if (admin) {
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
