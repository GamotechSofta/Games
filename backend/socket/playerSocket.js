import { Server } from 'socket.io';
import { setWalletSocketIo, playerWalletRoom } from './walletSocketBridge.js';
import { notifyPlayerWalletBalance } from '../utils/playerWalletNotify.js';
import { resolveActivePlayerUserIdFromSubscribe } from '../utils/playerSocketAuth.js';
import { parseAllowedOrigins } from '../config/cors.js';
import { initCallSocket } from './callSocket.js';
import { walletSocketEnabled, callSocketEnabled } from '../config/features.js';

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

  if (callSocketEnabled) {
    initCallSocket(io);
  }

  if (walletSocketEnabled) {
    io.on('connection', (socket) => {
      socket.on('wallet:subscribe', async (payload = {}) => {
        const userId = String(payload?.userId || '').trim();
        if (!userId) {
          socket.emit('wallet:subscribed', { ok: false, code: 'AUTH_REQUIRED' });
          return;
        }

        if (socket.data.playerWalletUserId && String(socket.data.playerWalletUserId) === userId) {
          socket.emit('wallet:subscribed', { ok: true, userId });
          return;
        }

        try {
          const resolved = await resolveActivePlayerUserIdFromSubscribe(payload);
          if (!resolved?.userId) {
            socket.emit('wallet:subscribed', { ok: false, code: resolved?.code || 'AUTH_REQUIRED' });
            return;
          }
          const prev = socket.data.playerWalletUserId;
          if (prev && String(prev) !== userId) {
            socket.leave(playerWalletRoom(prev));
          }
          socket.join(playerWalletRoom(userId));
          socket.data.playerWalletUserId = userId;
          socket.emit('wallet:subscribed', { ok: true, userId });

          if (!socket.data.walletBalanceSent) {
            socket.data.walletBalanceSent = true;
            notifyPlayerWalletBalance(userId, 'wallet_subscribe').catch(() => {});
          }
        } catch (err) {
          console.warn('[socket] wallet:subscribe failed:', err?.message || err);
          socket.emit('wallet:subscribed', { ok: false, code: 'SERVER_BUSY' });
        }
      });
    });
  }

  const parts = ['markets:updated events'];
  if (callSocketEnabled) parts.push('call signaling');
  if (walletSocketEnabled) parts.push('wallet rooms');
  console.log(`[socket] Socket.IO ready at /socket.io (${parts.join(', ')})`);
  return io;
}

/** @returns {Server | null} */
export function getPlayerSocketIo() {
  return io;
}
