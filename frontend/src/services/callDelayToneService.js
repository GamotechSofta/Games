/** Plays while connecting after Accept until voice is live — frontend/public/delayTone.mp3 */
import { isCallAudioUnlocked } from './callAudioUnlock';

const DELAY_SRC = '/delayTone.mp3';

let delayAudio = null;
let retryTimer = null;
let retryCount = 0;
const MAX_RETRIES = 8;

function getDelayAudio() {
  if (!delayAudio) {
    delayAudio = new Audio(DELAY_SRC);
    delayAudio.loop = true;
    delayAudio.preload = 'auto';
    delayAudio.setAttribute('playsinline', '');
  }
  return delayAudio;
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

async function tryPlayDelay() {
  const audio = getDelayAudio();
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
    void tryPlayDelay().then((ok) => {
      if (!ok) scheduleRetry();
    });
  }, 350);
}

export function startCallDelayTone() {
  if (typeof window === 'undefined') return;
  retryCount = 0;
  clearRetry();
  void tryPlayDelay().then((ok) => {
    if (!ok && (isCallAudioUnlocked() || retryCount < MAX_RETRIES)) {
      scheduleRetry();
    }
  });
}

export function stopCallDelayTone() {
  clearRetry();
  retryCount = 0;
  if (!delayAudio) return;
  try {
    delayAudio.pause();
    delayAudio.currentTime = 0;
  } catch (_) {}
}
