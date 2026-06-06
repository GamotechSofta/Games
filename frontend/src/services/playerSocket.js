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
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    auth: token && token !== 'cookie-auth' ? { token } : undefined,
  });

  socket.on('connect_error', (err) => {
    if (import.meta.env.DEV) {
      console.warn('[socket] connect_error:', err?.message || err);
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
