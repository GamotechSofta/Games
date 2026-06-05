/** Incoming call ringtone — frontend/public/callRingtone.mp3 */
import { isCallAudioUnlocked } from './callAudioUnlock';

const RING_SRC = '/callRingtone.mp3';

let ringAudio = null;
let retryTimer = null;
let retryCount = 0;
const MAX_RETRIES = 12;

function getRingAudio() {
  if (!ringAudio) {
    ringAudio = new Audio(RING_SRC);
    ringAudio.loop = true;
    ringAudio.preload = 'auto';
    ringAudio.setAttribute('playsinline', '');
  }
  return ringAudio;
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

async function tryPlayRing() {
  const audio = getRingAudio();
  try {
    audio.currentTime = 0;
    await audio.play();
    retryCount = 0;
    clearRetry();
    return true;
  } catch (_) {
    return false;
  }
}

function scheduleRetry() {
  if (retryCount >= MAX_RETRIES) return;
  retryCount += 1;
  clearRetry();
  retryTimer = setTimeout(() => {
    void tryPlayRing().then((ok) => {
      if (!ok) scheduleRetry();
    });
  }, 350);
}

function onVisibilityRetry() {
  if (!ringAudio || ringAudio.paused) return;
  void tryPlayRing();
}

let visibilityBound = false;

function bindVisibilityRetry() {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', onVisibilityRetry);
}

export function startCallRingtone() {
  if (typeof window === 'undefined') return;
  bindVisibilityRetry();
  retryCount = 0;
  clearRetry();

  void tryPlayRing().then((ok) => {
    if (!ok && (isCallAudioUnlocked() || retryCount < MAX_RETRIES)) {
      scheduleRetry();
    }
  });

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([400, 150, 400, 150, 400]);
    } catch (_) {}
  }
}

export function stopCallRingtone() {
  clearRetry();
  retryCount = 0;
  if (!ringAudio) return;
  try {
    ringAudio.pause();
    ringAudio.currentTime = 0;
  } catch (_) {}
}
