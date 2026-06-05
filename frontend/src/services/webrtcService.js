import { MEDIA_CONSTRAINTS } from './webrtcConfig';
import { getRtcConfiguration } from './iceConfigService';
import {
  createIceCandidateQueue,
  serializeIceCandidate,
} from './webrtcIce';

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

export async function createAnswer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  await pc._iceQueue?.markRemoteReady();

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // Trickle ICE — send answer immediately; candidates follow via socket
  return pc.localDescription || answer;
}

/** Create hidden audio element while ringing so playback starts faster on accept. */
export function prepareRemoteAudioElement() {
  let audio = document.getElementById('user-call-remote-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'user-call-remote-audio';
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
  }
  return audio;
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
  let audio = document.getElementById('user-call-remote-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'user-call-remote-audio';
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
  }
  if (streamOrTrack instanceof MediaStream) {
    audio.srcObject = streamOrTrack;
  } else if (streamOrTrack) {
    audio.srcObject = new MediaStream([streamOrTrack]);
  }
  const playPromise = audio.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {
      console.warn('[call] autoplay blocked — interact with the page if you hear no audio');
    });
  }
  return audio;
}

export function stopRemoteAudio() {
  const audio = document.getElementById('user-call-remote-audio');
  if (audio) {
    audio.srcObject = null;
    audio.remove();
  }
}
