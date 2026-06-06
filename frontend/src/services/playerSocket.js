import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';
import { getUserToken } from '../utils/auth';

/** @type {import('socket.io-client').Socket | null} */
let socket = null;
let consumerCount = 0;

/** Shared Socket.IO client for wallet sync and call signaling (one connection per tab). */
export function getPlayerSocket() {
  return socket;
}

export function connectPlayerSocket() {
  if (socket) return socket;

  const url = getSocketUrl();
  if (!url) return null;

  const token = getUserToken();
  socket = io(url, {
    path: '/socket.io',
    withCredentials: true,
    // Polling first — many production nginx setups block WebSocket upgrade.
    transports: import.meta.env.PROD ? ['polling', 'websocket'] : ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    auth: token && token !== 'cookie-auth' ? { token } : undefined,
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err?.message || err);
  });

  socket.on('connect', () => {
    if (import.meta.env.DEV) {
      console.info('[socket] connected', socket.id);
    }
  });

  return socket;
}

/** Call when a feature (wallet, call UI) needs the shared socket. */
export function acquirePlayerSocket() {
  const s = connectPlayerSocket();
  if (s) consumerCount += 1;
  return s;
}

/** Disconnect only when no features hold a reference (e.g. logout). */
export function releasePlayerSocket() {
  consumerCount = Math.max(0, consumerCount - 1);
  if (consumerCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
