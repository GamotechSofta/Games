/** One shared clock for online/offline badges (avoids per-row 5s context re-renders). */
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

export function getOnlineNowMs() {
    return nowMs;
}
