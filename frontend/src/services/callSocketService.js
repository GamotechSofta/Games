import { connectPlayerSocket, getPlayerSocket } from './playerSocket';

export function getCallSocket() {
  return getPlayerSocket();
}

/** Uses the shared player socket — does not open a second connection. */
export function connectUserCallSocket() {
  return connectPlayerSocket();
}

/** Call handlers detach only; wallet hook owns disconnect via releasePlayerSocket. */
export function disconnectUserCallSocket() {}

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
