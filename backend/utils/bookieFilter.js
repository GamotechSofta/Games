import User from '../models/user/user.js';

const bookieUsersCache = new Map();
const BOOKIE_USERS_CACHE_TTL_MS = 30 * 1000;

/**
 * Get user IDs that belong to a bookie (referredBy = bookieId)
 * Returns null if admin is super_admin or specific_admin (no filter - see all users).
 * Bookie sees only their referred users.
 */
export const getBookieUserIds = async (admin) => {
    if (!admin) return null;
    if (admin.role === 'super_admin' || admin.role === 'specific_admin') return null;
    if (admin.role === 'bookie') {
        const cacheKey = String(admin._id);
        const cached = bookieUsersCache.get(cacheKey);
        if (cached && Date.now() - cached.at < BOOKIE_USERS_CACHE_TTL_MS) {
            return cached.ids;
        }

        const users = await User.find({ referredBy: admin._id }).select('_id').lean();
        const ids = users.map((u) => u._id);
        bookieUsersCache.set(cacheKey, { ids, at: Date.now() });
        return ids;
    }
    return null;
};
