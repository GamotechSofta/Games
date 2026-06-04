/** Fallback if /call/ice-config is unreachable (STUN only — same Wi‑Fi may work, not reliable cross-network). */
export const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export const MEDIA_CONSTRAINTS = { audio: true, video: false };
