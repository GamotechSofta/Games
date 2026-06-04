import User from '../models/user/user.js';

const bookieUsersCache = new Map();
const BOOKIE_USERS_CACHE_TTL_MS = 30 * 1000;
const BOOKIE_USERS_CACHE_MAX_ENTRIES = 1000;

function pruneBookieUsersCache(now = Date.now()) {
    for (const [key, value] of bookieUsersCache.entries()) {
        if (!value?.at || now - value.at >= BOOKIE_USERS_CACHE_TTL_MS) {
            bookieUsersCache.delete(key);
        }
    }
    if (bookieUsersCache.size <= BOOKIE_USERS_CACHE_MAX_ENTRIES) return;
    const entries = [...bookieUsersCache.entries()].sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0));
    const overflow = bookieUsersCache.size - BOOKIE_USERS_CACHE_MAX_ENTRIES;
    for (let i = 0; i < overflow; i += 1) {
        bookieUsersCache.delete(entries[i][0]);
    }
}

/**
 * Get user IDs that belong to a bookie (referredBy = bookieId)
 * Returns null if admin is super_admin or specific_admin (no filter - see all users).
 * Bookie sees only their referred users.
 */
export const getBookieUserIds = async (admin) => {
    if (!admin) return null;
    if (admin.role === 'super_admin' || admin.role === 'specific_admin' || admin.role === 'telecaller') return null;
    if (admin.role === 'bookie') {
        const cacheKey = String(admin._id);
        pruneBookieUsersCache();
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
