/**
 * ICE servers for WebRTC (STUN + TURN).
 * TURN relay is required when caller and callee are on different networks / strict NAT.
 *
 * Configure either:
 * - TURN_URL + TURN_USERNAME + TURN_PASSWORD (or TURN_CREDENTIAL)
 * - TURN_URLS (comma-separated) + username/password
 * - METERED_TURN_API_KEY (fetches ephemeral credentials from Metered.ca)
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

function buildStunEntries() {
    const fromEnv = parseList(process.env.STUN_URLS);
    const urls = fromEnv.length ? fromEnv : DEFAULT_STUN;
    return urls.map((u) => ({ urls: u }));
}

function buildTurnEntry() {
    const username = process.env.TURN_USERNAME?.trim();
    const credential = (process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || '').trim();
    const urls = parseList(process.env.TURN_URLS);
    const single = process.env.TURN_URL?.trim();
    if (single && !urls.length) urls.push(single);

    if (!urls.length || !username || !credential) return null;

    // RTCPeerConnection accepts string or array for urls
    const turnUrls = urls.length === 1 ? urls[0] : urls;
    return {
        urls: turnUrls,
        username,
        credential,
    };
}

function buildStaticIceServers() {
    const iceServers = [...buildStunEntries()];
    const turn = buildTurnEntry();
    if (turn) iceServers.push(turn);
    return iceServers;
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
    const list = Array.isArray(data) ? data : data?.iceServers;
    if (!Array.isArray(list) || list.length === 0) {
        throw new Error('Metered TURN API returned no iceServers');
    }
    meteredCache = { at: now, iceServers: list };
    return list;
}

/**
 * @returns {Promise<{ iceServers: object[] }>}
 */
export async function getIceServerConfig() {
    const meteredKey = process.env.METERED_TURN_API_KEY?.trim();
    if (meteredKey) {
        try {
            const iceServers = await fetchMeteredIceServers(meteredKey);
            return { iceServers };
        } catch (err) {
            console.error('[ice] Metered fetch failed, falling back to env TURN:', err.message);
        }
    }

    const iceServers = buildStaticIceServers();
    const hasTurn = iceServers.some((s) => {
        const u = s.urls;
        const str = Array.isArray(u) ? u.join(' ') : String(u || '');
        return str.includes('turn:') || str.includes('turns:');
    });

    if (!hasTurn) {
        console.warn(
            '[ice] No TURN server configured — calls may only work on the same LAN/Wi‑Fi. '
            + 'Set TURN_URL, TURN_USERNAME, TURN_PASSWORD or METERED_TURN_API_KEY in .env',
        );
    }

    return { iceServers };
}

export function getIceConfigStatus() {
    const hasMetered = Boolean(process.env.METERED_TURN_API_KEY?.trim());
    const hasTurnEnv = Boolean(
        process.env.TURN_URL?.trim()
        && process.env.TURN_USERNAME?.trim()
        && (process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL),
    );
    return {
        turnConfigured: hasMetered || hasTurnEnv,
        source: hasMetered ? 'metered' : hasTurnEnv ? 'env' : 'stun-only',
    };
}
