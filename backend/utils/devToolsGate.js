const isProd = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Blocks dev-only routes in production. When DEV_TOOLS_SECRET is set (even in dev),
 * requires header X-Dev-Tools-Secret or query ?secret= to match.
 */
export function requireDevToolsAccess(req, res, next) {
    if (isProd()) {
        return res.status(404).json({
            success: false,
            message: 'Route not available',
        });
    }

    const expected = String(process.env.DEV_TOOLS_SECRET || '').trim();
    if (!expected) {
        return next();
    }

    const provided = String(
        req.headers['x-dev-tools-secret'] || req.query?.secret || '',
    ).trim();

    if (provided !== expected) {
        return res.status(403).json({
            success: false,
            message: 'Dev tools access denied',
        });
    }

    return next();
}
