/**
 * Lightweight structured logger for GAP wallet APIs.
 * Avoids logging sensitive key material.
 */
const formatMeta = (meta) => {
    if (!meta) return '';
    try {
        return ` ${JSON.stringify(meta)}`;
    } catch {
        return '';
    }
};

const SENSITIVE_KEYS = new Set([
    'authorization',
    'token',
    'accessToken',
    'refreshToken',
    'signature',
    'x-signature',
    'x-gap-signature',
    'gapPublicKey',
    'publicKey',
    'privateKey',
    'pem',
    'data',
    'hash',
    'secret',
    'password',
]);

const sanitizeObject = (value, depth = 0) => {
    if (value == null) return value;
    if (depth > 3) return '[truncated]';
    if (Array.isArray(value)) return value.slice(0, 25).map((v) => sanitizeObject(v, depth + 1));
    if (typeof value !== 'object') return value;

    const out = {};
    for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEYS.has(String(k))) {
            out[k] = '[redacted]';
            continue;
        }
        if (typeof v === 'string' && v.length > 500) {
            out[k] = `${v.slice(0, 120)}...[truncated]`;
            continue;
        }
        out[k] = sanitizeObject(v, depth + 1);
    }
    return out;
};

export const logger = {
    info(message, meta) {
        console.log(`[INFO] ${new Date().toISOString()} ${message}${formatMeta(meta)}`);
    },
    warn(message, meta) {
        console.warn(`[WARN] ${new Date().toISOString()} ${message}${formatMeta(meta)}`);
    },
    error(message, meta) {
        console.error(`[ERROR] ${new Date().toISOString()} ${message}${formatMeta(meta)}`);
    },
};

export const sanitizeForLog = (meta) => sanitizeObject(meta);

export default logger;
