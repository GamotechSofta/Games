import { Server } from 'socket.io';
import { setWalletSocketIo, playerWalletRoom } from './walletSocketBridge.js';
import { notifyPlayerWalletBalance } from '../utils/playerWalletNotify.js';
import { resolveActivePlayerUserIdFromSubscribe } from '../utils/playerSocketAuth.js';
import { parseAllowedOrigins } from '../config/cors.js';
import { initCallSocket } from './callSocket.js';

/** @type {Server | null} */
let io = null;

/**
 * Attach Socket.IO to the HTTP server (same port as Express API).
 * @param {import('http').Server} httpServer
 * @param {{ isProd?: boolean }} opts
 */
export function initPlayerSocket(httpServer, opts = {}) {
  const isProd = Boolean(opts.isProd);
  const allowedOrigins = parseAllowedOrigins();
  const allowAll = !isProd && allowedOrigins.length === 0;
  const origin = allowAll ? true : allowedOrigins.length ? allowedOrigins : true;

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  setWalletSocketIo(io);

  initCallSocket(io);

  io.on('connection', (socket) => {
    socket.on('wallet:subscribe', async (payload = {}) => {
      const resolved = await resolveActivePlayerUserIdFromSubscribe(payload);
      if (!resolved?.userId) {
        socket.emit('wallet:subscribed', { ok: false, code: resolved?.code || 'AUTH_REQUIRED' });
        return;
      }
      const { userId } = resolved;
      const prev = socket.data.playerWalletUserId;
      if (prev && String(prev) !== String(userId)) {
        socket.leave(playerWalletRoom(prev));
      }
      socket.join(playerWalletRoom(userId));
      socket.data.playerWalletUserId = userId;
      socket.emit('wallet:subscribed', { ok: true, userId });
      notifyPlayerWalletBalance(userId, 'wallet_subscribe').catch(() => {});
    });
  });

  console.log('[socket] player wallet Socket.IO ready at /socket.io');
  return io;
}

/** @returns {Server | null} */
export function getPlayerSocketIo() {
  return io;
}
