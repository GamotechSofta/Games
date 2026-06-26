const adminJwtCache = new Map();

export const ADMIN_JWT_CACHE_TTL_MS = 30 * 1000;
const ADMIN_JWT_CACHE_MAX_ENTRIES = 500;

export function pruneAdminJwtCache(now = Date.now()) {
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

export function getAdminJwtCached(adminId) {
    return adminJwtCache.get(String(adminId));
}

export function setAdminJwtCached(adminId, admin) {
    adminJwtCache.set(String(adminId), { admin, at: Date.now() });
}

/** Drop cached JWT profile immediately (e.g. account deactivated). */
export function invalidateAdminJwtCache(adminId) {
    if (adminId != null) {
        adminJwtCache.delete(String(adminId));
    }
}
