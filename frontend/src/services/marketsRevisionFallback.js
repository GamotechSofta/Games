import { API_BASE_URL } from '../config/api';
import fetchNoStore from '../utils/fetchNoStore';

const REVISION_POLL_MS = import.meta.env.PROD ? 5000 : 8000;
const REALTIME_GRACE_MS = 8000;

let pollTimer = null;
let graceTimer = null;
let onUpdateHandler = null;
/** @type {(() => boolean) | null} */
let isRealtimeHealthyRef = null;
let lastKnownTs = 0;
let pollActive = false;

async function fetchRevision() {
  const res = await fetchNoStore(`${API_BASE_URL.replace(/\/$/, '')}/markets/revision`);
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data || null;
}

async function pollRevisionOnce() {
  if (!onUpdateHandler) return;

  if (!import.meta.env.PROD
    && typeof isRealtimeHealthyRef === 'function'
    && isRealtimeHealthyRef()) {
    stopPolling();
    return;
  }

  try {
    const data = await fetchRevision();
    if (!data?.ts) return;

    if (lastKnownTs === 0) {
      lastKnownTs = data.ts;
      return;
    }

    if (data.ts > lastKnownTs) {
      lastKnownTs = data.ts;
      onUpdateHandler({
        ts: data.ts,
        marketId: data.marketId,
        marketType: data.marketType || 'main',
        reason: data.reason || 'revision_poll',
      });
    }
  } catch {
    /* network blip — retry on next tick */
  }
}

function startPolling() {
  if (pollActive) return;
  pollActive = true;
  void pollRevisionOnce();
  pollTimer = window.setInterval(() => {
    void pollRevisionOnce();
  }, REVISION_POLL_MS);
}

function stopPolling() {
  pollActive = false;
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Revision poll — in production always runs (tiny request) because Socket/SSE
 * often fail silently behind nginx until configured.
 */
export function startMarketsRevisionFallback(onUpdate, { isRealtimeHealthy } = {}) {
  onUpdateHandler = onUpdate;
  isRealtimeHealthyRef = isRealtimeHealthy;

  if (import.meta.env.PROD) {
    startPolling();
    return stopMarketsRevisionFallback;
  }

  if (graceTimer != null) {
    window.clearTimeout(graceTimer);
  }

  graceTimer = window.setTimeout(() => {
    graceTimer = null;
    if (typeof isRealtimeHealthyRef === 'function' && isRealtimeHealthyRef()) {
      return;
    }
    startPolling();
  }, REALTIME_GRACE_MS);

  return stopMarketsRevisionFallback;
}

export function stopMarketsRevisionFallback() {
  onUpdateHandler = null;
  isRealtimeHealthyRef = null;
  lastKnownTs = 0;
  stopPolling();
  if (graceTimer != null) {
    window.clearTimeout(graceTimer);
    graceTimer = null;
  }
}

export function notifyRevisionHandled(ts) {
  if (ts > lastKnownTs) {
    lastKnownTs = ts;
  }
}

export function isRevisionPollActive() {
  return pollActive;
}
