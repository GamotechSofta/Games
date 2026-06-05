import { API_BASE_URL } from '../utils/api';
import { ICE_SERVERS as FALLBACK } from './webrtcConfig';

let cached = null;
let loading = null;

/**
 * Load STUN/TURN from backend (enables calls across different networks).
 * @returns {Promise<{ iceServers: object[], turnConfigured: boolean, iceTransportPolicy: string }>}
 */
export async function getRtcConfiguration() {
    if (cached) return cached;
    if (loading) return loading;

    loading = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/call/ice-config`);
            const json = await res.json();
            if (json.success && json.data?.iceServers?.length) {
                cached = {
                    iceServers: json.data.iceServers,
                    turnConfigured: Boolean(json.data.turnConfigured),
                    iceTransportPolicy: json.data.iceTransportPolicy || 'all',
                };
                if (!cached.turnConfigured) {
                    console.error(
                        '[call] Server has no TURN — calls will NOT work on different internet. '
                        + 'Admin must run self-hosted coturn and set TURN_URL / TURN_USERNAME / TURN_PASSWORD.',
                    );
                }
                return cached;
            }
        } catch (err) {
            console.warn('[call] ICE config fetch failed, using STUN-only fallback', err);
        }
        cached = {
            iceServers: FALLBACK.iceServers,
            turnConfigured: false,
            iceTransportPolicy: 'all',
        };
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
