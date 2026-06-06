const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const TICK_MS = 30_000;

let nowMs = Date.now();
let intervalId = null;
const listeners = new Set();

function tick() {
    nowMs = Date.now();
    listeners.forEach((fn) => fn(nowMs));
}

export function subscribeOnlineClock(listener) {
    listeners.add(listener);
    listener(nowMs);
    if (!intervalId) {
        intervalId = setInterval(tick, TICK_MS);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };
}

export function computeIsOnline(item, now = nowMs) {
    const lastActive = item?.lastActiveAt ? new Date(item.lastActiveAt).getTime() : 0;
    return lastActive > 0 && now - lastActive < ONLINE_THRESHOLD_MS;
}

export function setupVisibilityRefresh(callback, intervalMs) {
    const run = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        callback();
    };
    const id = setInterval(run, intervalMs);
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', run);
    }
    return () => {
        clearInterval(id);
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', run);
        }
    };
}
