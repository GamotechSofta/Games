import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * HMAC-SHA256 signed provider API (launch + enabled-games).
 *
 * Env:
 *   OPERATOR_ID           — e.g. AAKDA-001
 *   API_KEY               — X-API-Key header
 *   API_SECRET            — shared secret (same value AWS Secrets Manager holds for the operator)
 *   PROVIDER_BASE_URL     — e.g. https://provider-1-bmsb.onrender.com
 *   PROVIDER_LAUNCH_PATH  — e.g. /api/v1/launch
 *
 * Launch (server → provider only; never from the browser):
 *   POST {PROVIDER_BASE_URL}{PROVIDER_LAUNCH_PATH}
 *   Payload = `{timestamp}\n{METHOD}\n{path}\n{rawBody}`
 *   Signature = HMAC-SHA256(API_SECRET, payload) as hex
 *
 * apiSecretPath is NOT sent in the launch request — provider resolves it via operatorId.
 */

export function buildHmacSignature({ timestamp, method, path, rawBody, secret }) {
    const payload = `${timestamp}\n${String(method).toUpperCase()}\n${path}\n${rawBody}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return { payload, signature };
}

function providerConfig() {
    const baseUrl = String(
        process.env.PROVIDER_BASE_URL ||
            process.env.TEENPATTI_PROVIDER_BASE_URL ||
            'https://provider-1-bmsb.onrender.com'
    )
        .trim()
        .replace(/\/$/, '');

    const launchPath = String(
        process.env.PROVIDER_LAUNCH_PATH ||
            process.env.TEENPATTI_PROVIDER_LAUNCH_PATH ||
            '/api/v1/launch'
    ).trim();

    return {
        baseUrl,
        launchPath: launchPath.startsWith('/') ? launchPath : `/${launchPath}`,
        apiKey: String(process.env.API_KEY || '').trim(),
        secret: String(process.env.API_SECRET || '').trim(),
        operatorId: String(process.env.OPERATOR_ID || '').trim(),
        gameCode: String(process.env.TEENPATTI_GAME_CODE || 'TEENPATTI').trim(),
        currency: String(process.env.TEENPATTI_CURRENCY || 'INR').trim(),
    };
}

function requireProviderAuth(cfg) {
    if (!cfg.apiKey) throw new Error('API_KEY is not configured');
    if (!cfg.secret) throw new Error('API_SECRET is not configured');
    if (!cfg.operatorId) throw new Error('OPERATOR_ID is not configured');
}

/** Compact one-line JSON (no pretty print / no extra spaces). Key order is fixed for HMAC. */
function buildCompactJson(obj) {
    return JSON.stringify(obj);
}

function buildLaunchBody({ operatorId, playerId, gameCode, currency }) {
    // Fixed key order matches provider docs / curl examples.
    return buildCompactJson({
        operatorId: String(operatorId),
        playerId: String(playerId),
        gameCode: String(gameCode),
        currency: String(currency || 'INR'),
    });
}

async function signedProviderRequest({ method, path, rawBody = '' }) {
    const cfg = providerConfig();
    requireProviderAuth(cfg);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const { signature } = buildHmacSignature({
        timestamp,
        method,
        path,
        rawBody,
        secret: cfg.secret,
    });

    const url = `${cfg.baseUrl}${path}`;
    const headers = {
        Accept: 'application/json',
        'X-API-Key': cfg.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
    };
    if (rawBody) headers['Content-Type'] = 'application/json';

    logger.info('[PROVIDER] request', {
        method,
        url,
        path,
        timestamp,
        rawBodyLength: rawBody.length,
        rawBodyPreview: rawBody.slice(0, 200),
    });

    const response = await fetch(url, {
        method,
        headers,
        body: rawBody || undefined,
    });

    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = { raw: text };
    }

    return { response, data, cfg, rawBody, timestamp, signature };
}

function extractLaunchUrl(data) {
    if (!data || typeof data !== 'object') return '';
    const nested = data.data && typeof data.data === 'object' ? data.data : null;
    const candidates = [
        data.launchUrl,
        data.launch_url,
        data.url,
        data.gameUrl,
        data.game_url,
        data.redirectUrl,
        data.redirect_url,
        nested?.launchUrl,
        nested?.launch_url,
        nested?.url,
        nested?.gameUrl,
        nested?.redirectUrl,
    ];
    for (const value of candidates) {
        const text = String(value || '').trim();
        if (text) return text;
    }
    return '';
}

function extractSessionId(data) {
    if (!data || typeof data !== 'object') return '';
    const nested = data.data && typeof data.data === 'object' ? data.data : null;
    return String(
        data.sessionId ||
            data.session_id ||
            nested?.sessionId ||
            nested?.session_id ||
            ''
    ).trim();
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
        if (Array.isArray(value.games)) return value.games;
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.enabledGames)) return value.enabledGames;
        if (Array.isArray(value.enabled_games)) return value.enabled_games;
    }
    return [];
}

/**
 * Normalize provider game rows for the frontend Games page.
 */
export function normalizeProviderGames(payload) {
    // Prefer enabledGames when present (provider list shape).
    const rows = asArray(
        payload?.enabledGames ||
            payload?.enabled_games ||
            payload?.data ||
            payload
    );
    return rows
        .map((row, index) => {
            if (!row || typeof row !== 'object') return null;
            const gameCode = String(
                row.code ||
                    row.gameCode ||
                    row.game_code ||
                    row.gameId ||
                    row.game_id ||
                    row.id ||
                    row.slug ||
                    ''
            ).trim();
            if (!gameCode) return null;
            const name = String(
                row.name || row.title || row.gameName || row.game_name || gameCode
            ).trim();
            const media =
                row.media && typeof row.media === 'object' ? row.media : null;
            const thumbnail = String(
                row.thumbnail ||
                    row.thumbnailUrl ||
                    row.thumbnail_url ||
                    row.thumbUrl ||
                    row.thumb_url ||
                    row.image ||
                    row.imageUrl ||
                    row.image_url ||
                    row.thumb ||
                    row.icon ||
                    row.cover ||
                    row.coverUrl ||
                    media?.thumbnail ||
                    media?.image ||
                    media?.url ||
                    ''
            ).trim();
            return {
                gameId: gameCode,
                gameCode,
                name,
                title: name,
                slug: String(row.slug || '').trim(),
                provider: String(row.provider || row.studio || 'Provider').trim(),
                thumbnail,
                image: thumbnail,
                currency: String(row.currency || 'INR').trim(),
                launchUrl: String(row.launchUrl || row.launch_url || '').trim(),
                status: String(row.status || '').trim(),
                source: 'provider',
                raw: row,
                _key: `${gameCode}-${index}`,
            };
        })
        .filter(Boolean);
}

/**
 * GET /api/v1/enabled-games?operatorId=AAKDA-001
 */
export async function fetchEnabledGames() {
    const cfg = providerConfig();
    requireProviderAuth(cfg);

    const path = `/api/v1/enabled-games?operatorId=${encodeURIComponent(cfg.operatorId)}`;
    const { response, data } = await signedProviderRequest({
        method: 'GET',
        path,
        rawBody: '',
    });

    if (!response.ok) {
        const message =
            data?.message ||
            data?.error ||
            data?.errorMessage ||
            `Failed to load enabled games (${response.status})`;
        const err = new Error(String(message));
        err.status = response.status;
        err.providerBody = data;
        throw err;
    }

    const games = normalizeProviderGames(data);
    return {
        operatorId: cfg.operatorId,
        games,
        raw: data,
    };
}

/**
 * Call provider POST {PROVIDER_LAUNCH_PATH} with HMAC headers + compact JSON body.
 * @param {{ playerId: string, gameCode?: string, currency?: string, operatorId?: string }} input
 */
export async function launchTeenPattiSession(input = {}) {
    const cfg = providerConfig();
    requireProviderAuth(cfg);

    const playerId = String(input.playerId || '').trim();
    if (!playerId) {
        throw new Error('playerId is required for provider launch');
    }

    // One-line compact JSON only — pretty JSON breaks HMAC verification.
    const rawBody = buildLaunchBody({
        operatorId: input.operatorId || cfg.operatorId,
        playerId,
        gameCode: String(input.gameCode || cfg.gameCode).trim().toUpperCase(),
        currency: String(input.currency || cfg.currency).trim().toUpperCase() || 'INR',
    });

    const { response, data } = await signedProviderRequest({
        method: 'POST',
        path: cfg.launchPath,
        rawBody,
    });

    if (!response.ok) {
        const htmlHint =
            typeof data?.raw === 'string'
                ? String(data.raw).match(/<pre>([^<]+)<\/pre>/i)?.[1]
                : '';
        const message =
            data?.message ||
            data?.error ||
            data?.errorMessage ||
            htmlHint ||
            `Provider launch failed (${response.status}) at ${cfg.baseUrl}${cfg.launchPath}`;
        logger.warn('[PROVIDER_LAUNCH] failed', {
            status: response.status,
            message,
            launchPath: cfg.launchPath,
            rawBody,
            body: data,
        });
        const err = new Error(String(message));
        // Never surface upstream 404 as "our route missing" — keep 502 Bad Gateway.
        err.status = 502;
        err.providerStatus = response.status;
        err.providerBody = data;
        throw err;
    }

    const launchUrl = extractLaunchUrl(data);
    if (!launchUrl) {
        logger.warn('[PROVIDER_LAUNCH] missing launchUrl', { body: data });
        throw new Error('Provider launch response missing launchUrl');
    }

    return {
        launchUrl,
        sessionId: extractSessionId(data),
        raw: data,
    };
}
