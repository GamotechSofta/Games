import { ICE_SERVERS, MEDIA_CONSTRAINTS } from './webrtcConfig';

export function createPeerConnection({ onIceCandidate, onRemoteTrack, onConnectionState }) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

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

export async function createAnswer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
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

/** Play remote telecaller audio in browser */
export function playRemoteAudio(streamOrTrack) {
  let audio = document.getElementById('user-call-remote-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'user-call-remote-audio';
    audio.autoplay = true;
    document.body.appendChild(audio);
  }
  if (streamOrTrack instanceof MediaStream) {
    audio.srcObject = streamOrTrack;
  } else if (streamOrTrack) {
    audio.srcObject = new MediaStream([streamOrTrack]);
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
