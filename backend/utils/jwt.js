import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_TOKEN_EXPIRY || '24h';  // 1 day
const BOOKIE_TOKEN_EXPIRY = process.env.BOOKIE_TOKEN_EXPIRY || '24h';

/**
 * Generate JWT for admin (super_admin, specific_admin, or bookie when logging into admin panel)
 */
export function generateAdminToken(payload) {
    return jwt.sign(
        { id: payload.id, username: payload.username, role: payload.role, type: 'admin' },
        JWT_SECRET,
        { expiresIn: ADMIN_TOKEN_EXPIRY }
    );
}

/**
 * Generate JWT for bookie (when logging into bookie panel)
 */
export function generateBookieToken(payload) {
    return jwt.sign(
        { id: payload.id, username: payload.username, role: 'bookie', type: 'bookie' },
        JWT_SECRET,
        { expiresIn: BOOKIE_TOKEN_EXPIRY }
    );
}

/**
 * Verify JWT and return decoded payload
 * @returns { id, username, role } or null if invalid
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { id: decoded.id, username: decoded.username, role: decoded.role };
    } catch {
        return null;
    }
}
