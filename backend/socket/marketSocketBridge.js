import { getWalletSocketIo } from './walletSocketBridge.js';
import { getPlayerSocketIo } from './playerSocket.js';
import { broadcastMarketSse } from '../utils/marketLiveStream.js';
import { bumpMarketRevision } from '../utils/marketRevision.js';

/**
 * Broadcast market result changes to all connected player clients (Socket.IO + SSE).
 * @param {{ marketId?: string, marketType?: string, reason?: string }} payload
 */
export function emitMarketsUpdated(payload = {}) {
  const event = bumpMarketRevision(payload);
  broadcastMarketSse(event);

  const io = getPlayerSocketIo() || getWalletSocketIo();
  if (!io) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[socket] markets:updated — Socket.IO not initialized (SSE/revision still updated)');
    }
    return;
  }

  io.emit('markets:updated', event);
}
