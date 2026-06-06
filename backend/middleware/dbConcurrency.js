import pLimit from 'p-limit';
import { isMongoTimeoutError, mongoTimeoutResponse } from '../utils/mongoErrors.js';

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * In-flight cap should stay below Mongo maxPoolSize so sockets/cron keep headroom.
 * Tune via env on production: API_MAX_IN_FLIGHT, API_MAX_QUEUE.
 */
const MAX_IN_FLIGHT = Number(process.env.API_MAX_IN_FLIGHT || (isProd ? 70 : 24));
const MAX_QUEUE = Number(process.env.API_MAX_QUEUE || (isProd ? 120 : 40));/** Safety release if a handler never finishes (prevents slot leaks). */
const SLOT_RELEASE_MS = Number(process.env.API_SLOT_RELEASE_MS || 35000);

const inFlight = pLimit(MAX_IN_FLIGHT);

const SKIP_PATHS = new Set(['/health', '/api/wallet/health']);

function shouldSkipConcurrency(req) {
  if (SKIP_PATHS.has(req.path || '')) return true;
  const url = String(req.originalUrl || '');
  return url.includes('/markets/live-updates')
    || url.includes('/markets/revision')
    || url.startsWith('/socket.io');
}

/**
 * Cap concurrent in-flight API requests so MongoDB pool is not flooded.
 * Requests wait briefly in the app queue; only bursts beyond the queue get 503 SERVER_BUSY.
 */
export function limitApiConcurrency(req, res, next) {
  if (shouldSkipConcurrency(req)) {
    return next();
  }

  if (inFlight.pendingCount >= MAX_QUEUE) {
    res.set('Retry-After', '2');
    return res.status(503).json({
      success: false,
      message: 'Server is busy. Please try again in a moment.',
      code: 'SERVER_BUSY',
    });
  }

  inFlight(() => new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, SLOT_RELEASE_MS);
    res.once('finish', done);
    res.once('close', done);
    next();
  })).catch((err) => {
    if (!res.headersSent) {
      if (isMongoTimeoutError(err)) {
        mongoTimeoutResponse(res);
        return;
      }
      console.warn('[api] concurrency middleware error:', err?.message || err);
      res.status(503).json({
        success: false,
        message: 'Server is busy. Please try again.',
        code: 'SERVER_BUSY',
      });
    }
  });
}