/** Fallback STUN-only (cross-network needs server TURN — see /api/v1/call/ice-config). */
export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const MEDIA_CONSTRAINTS = { audio: true, video: false };
