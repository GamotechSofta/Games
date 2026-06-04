/**
 * ICE servers for WebRTC (STUN + TURN).
 * TURN relay is required when caller and callee are on different networks / strict NAT.
 *
 * Configure ONE of:
 * - METERED_TURN_API_KEY or OPENRELAY_API_KEY (fetches from Metered — recommended)
 * - ICE_SERVERS_JSON (paste full iceServers array from Metered dashboard)
 * - TURN_URL + TURN_USERNAME + TURN_PASSWORD
 */

const DEFAULT_STUN = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun.relay.metered.ca:80',
];

let meteredCache = { at: 0, iceServers: null };
const METERED_CACHE_MS = 50 * 60 * 1000;

function parseList(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function iceServersHaveTurn(iceServers) {
    if (!Array.isArray(iceServers)) return false;
    return iceServers.some((s) => {
        const u = s.urls;
        const str = Array.isArray(u) ? u.join(' ') : String(u || '');
        return str.includes('turn:') || str.includes('turns:');
    });
}

function buildStunEntries() {
    const fromEnv = parseList(process.env.STUN_URLS);
    const urls = fromEnv.length ? fromEnv : DEFAULT_STUN;
    return urls.map((u) => ({ urls: u }));
}

function expandTurnUrls(baseUrls) {
    const out = new Set();
    for (const raw of baseUrls) {
        const u = String(raw || '').trim();
        if (!u) continue;
        out.add(u);
        if (u.startsWith('turn:') && !u.includes('transport=')) {
            out.add(`${u}?transport=tcp`);
        }
        if (u.startsWith('turn:') && !u.startsWith('turns:')) {
            const hostPart = u.replace(/^turn:/, '');
            const [hostPort] = hostPart.split('?');
            if (hostPort) {
                const host = hostPort.split(':')[0];
                out.add(`turn:${host}:443`);
                out.add(`turn:${host}:443?transport=tcp`);
                out.add(`turns:${host}:443?transport=tcp`);
            }
        }
    }
    return [...out];
}

function buildTurnEntries() {
    const username = process.env.TURN_USERNAME?.trim();
    const credential = (process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || '').trim();
    const urls = parseList(process.env.TURN_URLS);
    const single = process.env.TURN_URL?.trim();
    if (single && !urls.length) urls.push(single);

    if (!urls.length || !username || !credential) return [];

    const expanded = expandTurnUrls(urls);
    return expanded.map((url) => ({
        urls: url,
        username,
        credential,
    }));
}

function parseIceServersJson() {
    const raw = process.env.ICE_SERVERS_JSON?.trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed?.iceServers;
        return normalizeIceServers(list);
    } catch (err) {
        console.error('[ice] ICE_SERVERS_JSON invalid JSON:', err.message);
        return null;
    }
}

function buildStaticIceServers() {
    const iceServers = [...buildStunEntries()];
    iceServers.push(...buildTurnEntries());
    return iceServers;
}

function normalizeIceServers(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const entry of list) {
        if (!entry || typeof entry !== 'object') continue;
        const urls = entry.urls ?? entry.url;
        if (!urls) continue;
        const item = { urls };
        if (entry.username) item.username = entry.username;
        if (entry.credential) item.credential = entry.credential;
        out.push(item);
    }
    return out;
}

async function fetchMeteredIceServers(apiKey) {
    const now = Date.now();
    if (meteredCache.iceServers && now - meteredCache.at < METERED_CACHE_MS) {
        return meteredCache.iceServers;
    }

    const url = `https://raas.metered.ca/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Metered TURN API failed: ${res.status}`);
    }
    const data = await res.json();
    const list = normalizeIceServers(Array.isArray(data) ? data : data?.iceServers);
    if (list.length === 0) {
        throw new Error('Metered TURN API returned no iceServers');
    }
    meteredCache = { at: now, iceServers: list };
    return list;
}

/**
 * @returns {Promise<{ iceServers: object[], turnConfigured: boolean, source: string }>}
 */
export async function getIceServerConfig() {
    const fromJson = parseIceServersJson();
    if (fromJson?.length) {
        const hasTurn = iceServersHaveTurn(fromJson);
        return {
            iceServers: fromJson,
            turnConfigured: hasTurn,
            source: hasTurn ? 'ice-servers-json' : 'ice-servers-json-stun-only',
        };
    }

    const meteredKey = (
        process.env.METERED_TURN_API_KEY
        || process.env.OPENRELAY_API_KEY
    )?.trim();
    if (meteredKey) {
        try {
            const iceServers = await fetchMeteredIceServers(meteredKey);
            return {
                iceServers,
                turnConfigured: iceServersHaveTurn(iceServers),
                source: 'metered',
            };
        } catch (err) {
            console.error('[ice] Metered fetch failed, falling back to env TURN:', err.message);
        }
    }

    const iceServers = buildStaticIceServers();
    const turnConfigured = iceServersHaveTurn(iceServers);

    if (!turnConfigured) {
        console.warn(
            '[ice] No TURN server — calls only work on same Wi‑Fi/LAN. '
            + 'Set METERED_TURN_API_KEY (https://www.metered.ca/tools/openrelay/) or TURN_* / ICE_SERVERS_JSON in .env',
        );
    }

    return {
        iceServers,
        turnConfigured,
        source: turnConfigured ? 'env-turn' : 'stun-only',
    };
}

/** @deprecated Use getIceServerConfig() — kept for startup log */
export async function getIceConfigStatus() {
    const cfg = await getIceServerConfig();
    return {
        turnConfigured: cfg.turnConfigured,
        source: cfg.source,
    };
}
