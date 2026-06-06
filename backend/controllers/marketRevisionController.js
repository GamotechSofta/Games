import { getMarketRevision } from '../utils/marketRevision.js';

/**
 * GET /markets/revision — tiny poll target when Socket/SSE unavailable (production fallback).
 */
export function getMarketRevisionHandler(req, res) {
  res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.status(200).json({ success: true, data: getMarketRevision() });
}
