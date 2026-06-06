import { API_BASE_URL } from '../config/api';

/** @type {EventSource | null} */
let eventSource = null;
let reconnectTimer = null;
let sseOpen = false;
let onUpdateRef = null;

function buildLiveUpdatesUrl() {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/markets/live-updates`;
}

/**
 * SSE fallback for production (nginx often blocks WebSocket; SSE uses normal HTTPS).
 * @param {(payload: object) => void} onUpdate
 */
export function startMarketsLiveStream(onUpdate) {
  if (typeof EventSource === 'undefined') return stopMarketsLiveStream;

  onUpdateRef = onUpdate;
  stopMarketsLiveStream();

  const url = buildLiveUpdatesUrl();

  try {
    eventSource = new EventSource(url);
  } catch {
    scheduleReconnect();
    return stopMarketsLiveStream;
  }

  eventSource.onopen = () => {
    sseOpen = true;
  };

  eventSource.onmessage = (event) => {
    sseOpen = true;
    if (!event?.data || !onUpdateRef) return;
    try {
      const payload = JSON.parse(event.data);
      onUpdateRef(payload);
    } catch {
      /* ignore malformed */
    }
  };

  eventSource.onerror = () => {
    sseOpen = false;
    stopMarketsLiveStream();
    scheduleReconnect();
  };

  return stopMarketsLiveStream;
}

function scheduleReconnect() {
  if (reconnectTimer != null) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    if (onUpdateRef) {
      startMarketsLiveStream(onUpdateRef);
    }
  }, 5000);
}

export function stopMarketsLiveStream() {
  sseOpen = false;
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

export function isMarketsLiveStreamActive() {
  return Boolean(eventSource);
}

export function isMarketsLiveStreamOpen() {
  if (!eventSource) return false;
  return sseOpen || eventSource.readyState === EventSource.OPEN;
}
