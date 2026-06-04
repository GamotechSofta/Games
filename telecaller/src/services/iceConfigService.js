import { API_BASE_URL } from '../utils/api';
import { ICE_SERVERS as FALLBACK } from './webrtcConfig';

let cached = null;
let loading = null;

/**
 * Load STUN/TURN from backend (enables calls across different networks).
 */
export async function getRtcConfiguration() {
    if (cached) return cached;
    if (loading) return loading;

    loading = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/call/ice-config`);
            const json = await res.json();
            if (json.success && json.data?.iceServers?.length) {
                cached = { iceServers: json.data.iceServers };
                if (!json.data.turnConfigured) {
                    console.warn(
                        '[call] TURN not configured on server — cross-network calls may fail. '
                        + 'Set METERED_TURN_API_KEY or TURN_* in backend .env',
                    );
                }
                return cached;
            }
        } catch (err) {
            console.warn('[call] ICE config fetch failed, using STUN-only fallback', err);
        }
        cached = FALLBACK;
        return cached;
    })();

    const result = await loading;
    loading = null;
    return result;
}

export function clearIceConfigCache() {
    cached = null;
    loading = null;
}
