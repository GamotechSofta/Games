const COOKIE_NAME = 'admin_auth';

function isProd() {
    return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function parseExpiryMs() {
    const expiry = String(process.env.ADMIN_TOKEN_EXPIRY || '24h').trim();
    const match = expiry.match(/^(\d+)([hdm])$/i);
    if (!match) return 24 * 60 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
}

function resolveSameSite() {
    const configured = String(process.env.ADMIN_AUTH_COOKIE_SAME_SITE || '').toLowerCase().trim();
    if (configured === 'none' || configured === 'strict' || configured === 'lax') {
        return configured;
    }
    if (isProd() && String(process.env.ADMIN_AUTH_COOKIE_DOMAIN || '').trim()) {
        return 'none';
    }
    return 'lax';
}

export function getAdminAuthCookieName() {
    return COOKIE_NAME;
}

export function getAdminAuthCookieOptions() {
    const sameSite = resolveSameSite();
    const opts = {
        httpOnly: true,
        secure: sameSite === 'none' ? true : isProd(),
        sameSite,
        maxAge: parseExpiryMs(),
        path: '/',
    };
    const domain = String(process.env.ADMIN_AUTH_COOKIE_DOMAIN || '').trim();
    if (domain) opts.domain = domain;
    return opts;
}

export function setAdminAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, getAdminAuthCookieOptions());
}

export function clearAdminAuthCookie(res) {
    const opts = { ...getAdminAuthCookieOptions() };
    delete opts.maxAge;
    res.clearCookie(COOKIE_NAME, opts);
}

export function readAdminAuthToken(req) {
    const token = req.cookies?.[COOKIE_NAME];
    return token ? String(token).trim() : null;
}
