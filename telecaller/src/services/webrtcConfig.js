/** WebRTC: audio-only + STUN + TURN placeholder */
export const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:your-turn-server.com:3478',
            username: 'turnuser',
            credential: 'turnpassword',
        },
    ],
};

export const MEDIA_CONSTRAINTS = { audio: true, video: false };
