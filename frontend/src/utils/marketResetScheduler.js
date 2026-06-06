import { getTodayIST } from './marketTiming';

const DEFAULT_INTERVAL_MS = 60 * 1000;

/** @type {Set<() => void>} */
const listeners = new Set();
let intervalId = null;
let lastDateKey = null;
let activeIntervalMs = DEFAULT_INTERVAL_MS;

function notifyIfDateChanged() {
  const today = getTodayIST();
  if (lastDateKey !== null && lastDateKey !== today) {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (_) {}
    });
  }
  lastDateKey = today;
}

function onVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  notifyIfDateChanged();
}

function startScheduler(intervalMs) {
  if (intervalId != null) return;

  activeIntervalMs = Math.max(1000, Number(intervalMs) || DEFAULT_INTERVAL_MS);
  lastDateKey = getTodayIST();
  intervalId = window.setInterval(notifyIfDateChanged, activeIntervalMs);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
}

function stopScheduler() {
  if (intervalId != null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
  lastDateKey = null;
}

/**
 * Subscribe to IST midnight market reset. One shared timer for the whole app.
 * @param {() => void} listener
 * @param {number} [intervalMs]
 * @returns {() => void} unsubscribe
 */
export function subscribeMarketReset(listener, intervalMs = DEFAULT_INTERVAL_MS) {
  listeners.add(listener);
  startScheduler(intervalMs);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopScheduler();
    }
  };
}
