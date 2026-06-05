/** Incoming call ringtone — frontend/public/callRingtone.mp3 */
const RING_SRC = '/callRingtone.mp3';

let ringAudio = null;

export function startCallRingtone() {
  if (typeof window === 'undefined') return;
  try {
    if (!ringAudio) {
      ringAudio = new Audio(RING_SRC);
      ringAudio.loop = true;
      ringAudio.preload = 'auto';
    }
    ringAudio.currentTime = 0;
    const playPromise = ringAudio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  } catch (_) {}
}

export function stopCallRingtone() {
  if (!ringAudio) return;
  try {
    ringAudio.pause();
    ringAudio.currentTime = 0;
  } catch (_) {}
}
