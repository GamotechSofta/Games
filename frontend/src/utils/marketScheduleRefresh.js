import { getNextMarketRefreshMs } from './marketTiming';

/** @type {Set<() => void>} */
const listeners = new Set();
/** @type {Array} */
let scheduledMarkets = [];
let timeoutId = null;
let lastRefreshCheckMs = Date.now();

function clearScheduledTimeout() {
  if (timeoutId != null) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function notifyListeners() {
  lastRefreshCheckMs = Date.now();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

function armNextTimeout(markets, now = new Date()) {
  clearScheduledTimeout();

  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return;
  }

  const nextMs = getNextMarketRefreshMs(markets, now);
  if (nextMs == null) return;

  const delay = Math.max(250, Math.min(nextMs - now.getTime(), 24 * 60 * 60 * 1000));
  timeoutId = window.setTimeout(() => {
    notifyListeners();
  }, delay);
}

function onVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
    clearScheduledTimeout();
    return;
  }

  const now = new Date();
  const missedRefreshAt = getNextMarketRefreshMs(scheduledMarkets, new Date(lastRefreshCheckMs));
  if (missedRefreshAt != null && missedRefreshAt <= now.getTime()) {
    notifyListeners();
    return;
  }

  armNextTimeout(scheduledMarkets, now);
}

function startVisibilityListener() {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', onVisibilityChange);
}

function stopVisibilityListener() {
  if (typeof document === 'undefined') return;
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

/**
 * Schedule a single shared refresh when any market hits opening, closure, closing, or midnight IST.
 * When one boundary is reached, all listeners refetch every market.
 *
 * @param {() => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeMarketScheduleRefresh(listener) {
  const hadListeners = listeners.size > 0;
  listeners.add(listener);

  if (!hadListeners) {
    startVisibilityListener();
  }

  armNextTimeout(scheduledMarkets);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearScheduledTimeout();
      stopVisibilityListener();
      scheduledMarkets = [];
    }
  };
}

/**
 * Recompute the next refresh timeout after markets data changes.
 * @param {Array} markets
 */
export function updateMarketScheduleRefresh(markets) {
  scheduledMarkets = Array.isArray(markets) ? markets : [];
  armNextTimeout(scheduledMarkets);
}
