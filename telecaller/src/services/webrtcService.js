import { MEDIA_CONSTRAINTS } from './webrtcConfig';
import { getRtcConfiguration } from './iceConfigService';

/**
 * Outbound call from telecaller browser to user.
 */
export async function createPeerConnection({ onIceCandidate, onRemoteTrack, onConnectionState }) {
    const rtcConfig = await getRtcConfiguration();
    const pc = new RTCPeerConnection({
        ...rtcConfig,
        iceTransportPolicy: 'all',
    });

    pc.onicecandidate = (e) => {
        if (e.candidate) onIceCandidate?.(e.candidate);
    };

    pc.ontrack = (e) => {
        onRemoteTrack?.(e.streams[0] || e.track);
    };

    pc.onconnectionstatechange = () => {
        onConnectionState?.(pc.connectionState);
    };

    return pc;
}

export async function getLocalAudioStream() {
    return navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
}

export function attachLocalStream(pc, stream) {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
}

export async function createOffer(pc) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
}

export async function applyAnswer(pc, answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function addIceCandidate(pc, candidate) {
    if (!candidate) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export function closePeerConnection(pc) {
    if (!pc) return;
    pc.getSenders?.().forEach((s) => s.track?.stop());
    pc.close();
}

export function playRemoteAudio(streamOrTrack) {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.id = 'telecaller-remote-audio';
    const prev = document.getElementById(audio.id);
    if (prev) prev.remove();

    if (streamOrTrack instanceof MediaStream) {
        audio.srcObject = streamOrTrack;
    } else if (streamOrTrack) {
        audio.srcObject = new MediaStream([streamOrTrack]);
    }
    document.body.appendChild(audio);
    return audio;
}

export function stopRemoteAudio() {
    const el = document.getElementById('telecaller-remote-audio');
    if (el) {
        el.srcObject = null;
        el.remove();
    }
}
