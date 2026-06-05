/**
 * Mobile browsers block audio until a user gesture. Warm call sounds once on first tap.
 */

const RING_SRC = '/callRingtone.mp3';
const DELAY_SRC = '/delayTone.mp3';

let unlocked = false;
let warming = false;

async function warmClip(src) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = 0.001;
  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
  } catch (_) {
    /* still mark unlocked — ringtone service will retry */
  }
}

export function isCallAudioUnlocked() {
  return unlocked;
}

/** Call once from a user gesture (pointerdown / click). */
export async function unlockCallAudio() {
  if (unlocked || warming) return unlocked;
  warming = true;
  try {
    await Promise.all([warmClip(RING_SRC), warmClip(DELAY_SRC)]);
    unlocked = true;
  } finally {
    warming = false;
  }
  return unlocked;
}

export function bindCallAudioUnlock() {
  if (typeof window === 'undefined') return () => {};
  const onGesture = () => {
    void unlockCallAudio();
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
  };
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  return () => {
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
  };
}
