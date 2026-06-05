import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';

let socket = null;

export function getCallSocket() {
  return socket;
}

export function connectUserCallSocket() {
  if (socket?.connected) return socket;

  const url = getSocketUrl();
  if (!url) return null;

  socket = io(url, {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1500,
  });

  return socket;
}

export function disconnectUserCallSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function registerUser(userId, name, phone) {
  const s = connectUserCallSocket();
  if (!s) return;
  s.emit('register', {
    userId: String(userId),
    role: 'user',
    name: name || '',
    phone: phone || '',
  });
}

export function emitCallRequest({ userId, name, phone, issue }) {
  getCallSocket()?.emit('call-request', { userId, name, phone, issue });
}

export function emitCancelCallRequest(userId) {
  getCallSocket()?.emit('cancel-call-request', { userId: String(userId) });
}
