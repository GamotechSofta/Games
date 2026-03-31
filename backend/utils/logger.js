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

export default logger;
