import { isDbReady } from '../config/db_Connection.js';
import { isMongoTimeoutError, mongoTimeoutResponse } from '../utils/mongoErrors.js';

const DEFAULT_API_TIMEOUT_MS = Number(process.env.API_REQUEST_TIMEOUT_MS || 28000);

/**
 * Catch async errors from route handlers / middleware (Express 4 does not do this automatically).
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (res.headersSent) return;
      if (isMongoTimeoutError(err)) {
        return mongoTimeoutResponse(res);
      }
      console.error(`[api] ${req.method} ${req.originalUrl}:`, err?.message || err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Internal server error',
      });
    });
  };
}

/**
 * Reject API traffic until MongoDB is connected (prevents buffering timeouts / hangs).
 */
export function requireDbReady(req, res, next) {
  if (!isDbReady()) {
    res.set('Retry-After', '2');
    return res.status(503).json({
      success: false,
      message: 'Database connection is not ready. Please retry in a moment.',
      code: 'DB_NOT_READY',
    });
  }
  next();
}

/**
 * Return 504 if a handler does not finish in time (avoids clients waiting indefinitely).
 */
export function apiRequestTimeout(timeoutMs = DEFAULT_API_TIMEOUT_MS) {
  return (req, res, next) => {
    if (String(req.originalUrl || '').includes('/markets/live-updates')
      || String(req.originalUrl || '').includes('/markets/revision')) {
      return next();
    }

    let settled = false;

    const timer = setTimeout(() => {
      if (settled || res.headersSent) return;
      settled = true;
      console.warn(`[api] request timeout ${req.method} ${req.originalUrl}`);
      res.status(504).json({
        success: false,
        message: 'Request took too long. Please try again.',
        code: 'REQUEST_TIMEOUT',
      });
    }, timeoutMs);

    const clear = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
    };

    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}
