import {
  addMarketSseClient,
  removeMarketSseClient,
} from '../utils/marketLiveStream.js';
import { parseAllowedOrigins } from '../config/cors.js';

const KEEPALIVE_MS = 25000;

function setSseCors(req, res) {
  const origin = (req.headers.origin || '').toString().replace(/\/$/, '');
  const allowed = parseAllowedOrigins();
  if (!origin) return;
  if (allowed.length === 0 || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * GET /markets/live-updates — Server-Sent Events (works through nginx without WebSocket upgrade).
 */
export function marketLiveUpdates(req, res) {
  setSseCors(req, res);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write(': connected\n\n');
  addMarketSseClient(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      removeMarketSseClient(res);
    }
  }, KEEPALIVE_MS);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeMarketSseClient(res);
  });
}
