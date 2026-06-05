/** Plays while connecting after Accept until voice is live — frontend/public/delayTone.mp3 */
const DELAY_SRC = '/delayTone.mp3';

let delayAudio = null;

export function startCallDelayTone() {
  if (typeof window === 'undefined') return;
  try {
    if (!delayAudio) {
      delayAudio = new Audio(DELAY_SRC);
      delayAudio.loop = true;
      delayAudio.preload = 'auto';
    }
    delayAudio.currentTime = 0;
    const playPromise = delayAudio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  } catch (_) {}
}

export function stopCallDelayTone() {
  if (!delayAudio) return;
  try {
    delayAudio.pause();
    delayAudio.currentTime = 0;
  } catch (_) {}
}
