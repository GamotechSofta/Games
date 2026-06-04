import { MEDIA_CONSTRAINTS } from './webrtcConfig';
import { getRtcConfiguration } from './iceConfigService';
import {
    createIceCandidateQueue,
    waitForIceGatheringComplete,
    serializeIceCandidate,
} from './webrtcIce';

/**
 * Outbound call from telecaller browser to user.
 */
export async function createPeerConnection({ onIceCandidate, onRemoteTrack, onConnectionState }) {
    const rtcConfig = await getRtcConfiguration();
    const pc = new RTCPeerConnection({
        iceServers: rtcConfig.iceServers,
        iceTransportPolicy: rtcConfig.iceTransportPolicy || 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
    });

    const iceQueue = createIceCandidateQueue(pc);
    pc._iceQueue = iceQueue;

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            onIceCandidate?.(serializeIceCandidate(e.candidate));
        }
    };

    pc.ontrack = (e) => {
        const stream = e.streams?.[0] || (e.track ? new MediaStream([e.track]) : null);
        if (stream) onRemoteTrack?.(stream);
    };

    pc.onconnectionstatechange = () => {
        onConnectionState?.(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        if (ice === 'connected' || ice === 'completed') {
            onConnectionState?.('connected');
        } else if (ice === 'failed') {
            onConnectionState?.('failed');
        }
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
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);
    return pc.localDescription || offer;
}

export async function applyAnswer(pc, answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    await pc._iceQueue?.markRemoteReady();
}

export async function addIceCandidate(pc, candidate) {
    if (!candidate || !pc) return;
    if (pc._iceQueue) {
        await pc._iceQueue.add(candidate);
        return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export function closePeerConnection(pc) {
    if (!pc) return;
    pc._iceQueue?.clear();
    pc.getSenders?.().forEach((s) => s.track?.stop());
    pc.close();
}

export function playRemoteAudio(streamOrTrack) {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audio.id = 'telecaller-remote-audio';
    const prev = document.getElementById(audio.id);
    if (prev) prev.remove();

    if (streamOrTrack instanceof MediaStream) {
        audio.srcObject = streamOrTrack;
    } else if (streamOrTrack) {
        audio.srcObject = new MediaStream([streamOrTrack]);
    }
    document.body.appendChild(audio);
    const playPromise = audio.play();
    if (playPromise?.catch) {
        playPromise.catch(() => {
            console.warn('[call] autoplay blocked — click the page if you hear no audio');
        });
    }
    return audio;
}

export function stopRemoteAudio() {
    const el = document.getElementById('telecaller-remote-audio');
    if (el) {
        el.srcObject = null;
        el.remove();
    }
}
