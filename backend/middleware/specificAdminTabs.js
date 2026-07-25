/**
 * Server-side tab enforcement for specific_admin accounts.
 * super_admin, bookie, and telecaller roles are not restricted here.
 */

const ALWAYS_ALLOWED_PREFIXES = [
    '/api/v1/admin/me/secret-declare-password',
    '/api/v1/admin/verify-secret-declare-password',
];

const SUPER_ADMIN_ONLY_PREFIXES = [
    '/api/v1/admin/super-admins',
    '/api/v1/admin/specific-admins',
    '/api/v1/admin/bookies',
    '/api/v1/admin/create',
    '/api/v1/admin/create-bookie',
];

function normalizePath(originalUrl = '') {
    return String(originalUrl).split('?')[0].toLowerCase();
}

function matchesAny(path, prefixes) {
    return prefixes.some((prefix) => path.startsWith(prefix.toLowerCase()));
}

/**
 * Returns tab paths that grant access, or null if unrestricted (super_admin paths handled separately).
 */
function getRequiredTabs(path, method) {
    const m = String(method || 'GET').toUpperCase();

    if (path.startsWith('/api/v1/dashboard')) return ['/dashboard'];
    if (path.startsWith('/api/v1/users')) return ['/all-users'];
    if (path.includes('/admin/telecallers')) return ['/telecaller'];
    if (path.startsWith('/api/v1/rates')) return ['/update-rate'];
    if (path.startsWith('/api/v1/bets')) return ['/bet-history'];
    if (path.startsWith('/api/v1/payments')) return ['/payment-management'];
    if (path.startsWith('/api/v1/settlements')) return ['/daily-settlement'];
    if (path.startsWith('/api/v1/wallet')) return ['/wallet'];
    if (path.startsWith('/api/v1/help-desk')) return ['/help-desk'];
    if (path.includes('/admin/logs')) return ['/logs'];

    if (path.startsWith('/api/v1/reports/revenue')) return ['/revenue'];
    if (path.startsWith('/api/v1/reports')) return ['/reports'];
    if (path.startsWith('/api/v1/admin/game')) return ['/game-management'];

    if (!path.startsWith('/api/v1/markets')) return null;

    if (
        /\/(preview-declare|declare-open|declare-close|declare-king-bazaar|clear-result|winning-bets)/.test(path)
    ) {
        return ['/add-result'];
    }

    if (m === 'GET' || m === 'HEAD') {
        return ['/markets', '/add-result'];
    }

    return ['/markets'];
}

export function checkSpecificAdminAccess(req) {
    const admin = req.admin;
    if (!admin || admin.role !== 'specific_admin') {
        return { allowed: true };
    }

    const path = normalizePath(req.originalUrl || req.url || '');

    if (matchesAny(path, ALWAYS_ALLOWED_PREFIXES)) {
        return { allowed: true };
    }

    if (matchesAny(path, SUPER_ADMIN_ONLY_PREFIXES)) {
        return {
            allowed: false,
            message: 'Super admin access required',
        };
    }

    const allowedTabs = Array.isArray(admin.allowedTabs) ? admin.allowedTabs : [];
    if (allowedTabs.length === 0) {
        return {
            allowed: false,
            message: 'No permissions configured for this account',
        };
    }

    const requiredTabs = getRequiredTabs(path, req.method);
    if (requiredTabs == null) {
        return {
            allowed: false,
            message: 'Access denied for this resource',
        };
    }

    const hasTab = requiredTabs.some((tab) => allowedTabs.includes(tab));
    if (!hasTab) {
        return {
            allowed: false,
            message: 'You do not have permission to access this resource',
        };
    }

    return { allowed: true };
}

export function enforceSpecificAdminTabs(req, res, next) {
    const result = checkSpecificAdminAccess(req);
    if (!result.allowed) {
        return res.status(403).json({
            success: false,
            message: result.message || 'Access denied',
        });
    }
    return next();
}
