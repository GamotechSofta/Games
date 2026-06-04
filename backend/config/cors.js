/**
 * Build Express CORS options from environment.
 *
 * CORS_ORIGINS or CORS_ORIGIN — comma-separated browser origins (no trailing slash).
 * FRONTEND_BASE_URL is always merged if set.
 */

function normalizeOrigin(value) {
    return String(value || '').trim().replace(/\/$/, '');
}

/** Panel / app base URLs merged into allowed origins when set in .env */
const PANEL_BASE_URL_KEYS = [
    'FRONTEND_BASE_URL',
    'ADMIN_BASE_URL',
    'BOOKIE_BASE_URL',
    'TELECALLER_BASE_URL',
];

/** Local Vite dev servers (telecaller = 5177) — appended when CORS_ORIGINS is set */
const LOCAL_DEV_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5177',
    'http://127.0.0.1:5177',
];

export function parseAllowedOrigins(env = process.env) {
    const raw = env.CORS_ORIGINS || env.CORS_ORIGIN || '';
    const fromEnv = raw
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);

    const merged = new Set(fromEnv);

    for (const key of PANEL_BASE_URL_KEYS) {
        const origin = normalizeOrigin(env[key]);
        if (origin) merged.add(origin);
    }

    const isProd = String(env.NODE_ENV || '').toLowerCase() === 'production';
    const includeLocalDev = String(env.CORS_INCLUDE_LOCAL_DEV || '').toLowerCase() === 'true'
        || (!isProd && fromEnv.length > 0);
    if (includeLocalDev) {
        for (const o of LOCAL_DEV_ORIGINS) merged.add(o);
    }

    return [...merged];
}

export function getCorsOptions({ isProd = false, env = process.env } = {}) {
    const allowedOrigins = parseAllowedOrigins(env);

    if (allowedOrigins.length === 0) {
        if (!isProd) {
            return { origin: true, credentials: true };
        }
        console.warn('[WARN][PROD] CORS_ORIGINS not set — cross-origin browser requests will be blocked');
        return {
            origin: false,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        };
    }

    const allowed = new Set(allowedOrigins);

    return {
        origin(origin, callback) {
            // Same-origin, curl, Postman, server-to-server — no Origin header
            if (!origin) {
                return callback(null, true);
            }
            if (allowed.has(normalizeOrigin(origin))) {
                return callback(null, true);
            }
            if (!isProd) {
                console.warn(`[CORS] Blocked origin: ${origin}`);
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        optionsSuccessStatus: 204,
    };
}

export function logCorsConfig({ isProd = false, env = process.env } = {}) {
    const origins = parseAllowedOrigins(env);
    if (origins.length === 0) {
        console.log(`[CORS] ${isProd ? 'no origins configured (blocked in prod)' : 'development — all origins allowed'}`);
        return;
    }
    console.log(`[CORS] Allowed origins (${origins.length}):`);
    for (const o of origins) console.log(`[CORS]   - ${o}`);
}
