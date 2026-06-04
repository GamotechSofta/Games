import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/socket';

let socket = null;

export function getCallSocket() {
    return socket;
}

export function connectCallSocket() {
    if (socket?.connected) return socket;

    const url = getSocketUrl();
    socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1500,
    });

    return socket;
}

export function disconnectCallSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function registerTelecaller(telecallerId, name) {
    const s = connectCallSocket();
    s.emit('register', {
        userId: String(telecallerId),
        role: 'telecaller',
        name: name || 'Telecaller',
    });
}
