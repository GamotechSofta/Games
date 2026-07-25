import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_TOKEN_EXPIRY || '24h';  // 1 day
const BOOKIE_TOKEN_EXPIRY = process.env.BOOKIE_TOKEN_EXPIRY || '24h';
const USER_TOKEN_EXPIRY = process.env.USER_TOKEN_EXPIRY || '7d';

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
 * Generate JWT for user (OTP/password login from frontend)
 */
export function generateUserToken(payload) {
    return jwt.sign(
        { id: payload.id, phone: payload.phone, role: 'user', type: 'user' },
        JWT_SECRET,
        { expiresIn: USER_TOKEN_EXPIRY }
    );
}

const OPERATOR_USER_TOKEN_EXPIRY =
    process.env.OPERATOR_USER_TOKEN_EXPIRY || '2h';

/**
 * Short-lived token passed to external games as `id` query param
 * (e.g. PotLudo / fashionbuddies.in).
 */
export function generateOperatorUserToken(payload) {
    return jwt.sign(
        {
            id: String(payload.id),
            phone: payload.phone || '',
            gameId: payload.gameId ? String(payload.gameId) : undefined,
            role: 'user',
            type: 'operator_user',
        },
        JWT_SECRET,
        { expiresIn: OPERATOR_USER_TOKEN_EXPIRY }
    );
}

/**
 * Verify operator-user launch token (`id` from game URL).
 * @returns decoded payload or null
 */
export function verifyOperatorUserToken(token) {
    try {
        const decoded = jwt.verify(String(token || ''), JWT_SECRET);
        if (decoded.type !== 'operator_user' && decoded.type !== 'user') {
            return null;
        }
        return decoded;
    } catch {
        return null;
    }
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
