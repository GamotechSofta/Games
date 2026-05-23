/**
 * Build Express CORS options from environment.
 *
 * CORS_ORIGINS or CORS_ORIGIN — comma-separated browser origins (no trailing slash).
 * FRONTEND_BASE_URL is always merged if set.
 */

function normalizeOrigin(value) {
    return String(value || '').trim().replace(/\/$/, '');
}

export function parseAllowedOrigins(env = process.env) {
    const raw = env.CORS_ORIGINS || env.CORS_ORIGIN || '';
    const fromEnv = raw
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);

    const merged = new Set(fromEnv);

    const frontend = normalizeOrigin(env.FRONTEND_BASE_URL);
    if (frontend) merged.add(frontend);

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
