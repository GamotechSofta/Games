/**
 * Click-to-call signaling over Socket.IO.
 * Events: register, call-request, call-user, answer-call, reject-call,
 *          ice-candidate, end-call (+ server emits user-unavailable, new-call-request, etc.)
 */

import {
    addCallRequest,
    removeCallRequest,
    listCallRequests,
} from './callRequestStore.js';

/** userId -> socket.id */
const userIdToSocket = new Map();
/** socket.id -> { userId, role, name } */
const socketMeta = new Map();

function normalizeRegisterPayload(payload) {
    if (typeof payload === 'string' || typeof payload === 'number') {
        return { userId: String(payload).trim(), role: 'user', name: '' };
    }
    if (payload && typeof payload === 'object') {
        return {
            userId: String(payload.userId || payload.id || '').trim(),
            role: String(payload.role || 'user').trim(),
            name: String(payload.name || '').trim(),
        };
    }
    return { userId: '', role: 'user', name: '' };
}

function getSocketIdForUser(userId) {
    return userIdToSocket.get(String(userId || '').trim()) || null;
}

function emitToUser(io, userId, event, data) {
    const sid = getSocketIdForUser(userId);
    if (sid) io.to(sid).emit(event, data);
    return Boolean(sid);
}

function unregisterSocket(socket) {
    const meta = socketMeta.get(socket.id);
    if (meta?.userId) {
        const current = userIdToSocket.get(meta.userId);
        if (current === socket.id) userIdToSocket.delete(meta.userId);
    }
    socketMeta.delete(socket.id);
}

/**
 * Attach call signaling handlers to the shared Socket.IO server.
 * @param {import('socket.io').Server} io
 */
export function initCallSocket(io) {
    io.on('connection', (socket) => {
        socket.on('register', (payload) => {
            const { userId, role, name } = normalizeRegisterPayload(payload);
            if (!userId) {
                socket.emit('register-error', { message: 'userId required' });
                return;
            }

            unregisterSocket(socket);
            userIdToSocket.set(userId, socket.id);
            socketMeta.set(socket.id, { userId, role, name });
            socket.data.userId = userId;
            socket.data.role = role;

            if (role === 'telecaller') {
                socket.join('telecallers');
                socket.emit('pending-call-requests', listCallRequests());
            }

            socket.emit('registered', { userId, role });
        });

        /** User (web/Flutter) requests a callback from telecaller team */
        socket.on('call-request', (data = {}) => {
            const meta = socketMeta.get(socket.id);
            const userId = String(data.userId || meta?.userId || '').trim();
            if (!userId) return;

            const entry = addCallRequest({
                userId,
                name: data.name || meta?.name || 'Player',
                phone: data.phone || '',
            });

            io.to('telecallers').emit('new-call-request', entry);
            socket.emit('call-request-ack', { ok: true, request: entry });
        });

        /** Telecaller starts WebRTC call to user */
        socket.on('call-user', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            const offer = data.offer;
            if (!from || !to || !offer) return;

            removeCallRequest(to);

            const delivered = emitToUser(io, to, 'incoming-call', {
                from,
                to,
                offer,
                callerName: data.callerName || 'Telecaller',
            });

            if (!delivered) {
                socket.emit('user-unavailable', { userId: to, reason: 'offline' });
                io.to('telecallers').emit('call-request-removed', { userId: to });
            } else {
                io.to('telecallers').emit('call-request-removed', { userId: to });
            }
        });

        socket.on('answer-call', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            const answer = data.answer;
            if (!from || !to || !answer) return;
            emitToUser(io, to, 'call-answered', { from, to, answer });
        });

        socket.on('reject-call', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            if (!from || !to) return;
            emitToUser(io, to, 'call-rejected', { from, to });
        });

        socket.on('ice-candidate', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            const candidate = data.candidate;
            if (!from || !to || !candidate) return;
            emitToUser(io, to, 'ice-candidate', { from, to, candidate });
        });

        socket.on('end-call', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            if (!to) return;
            emitToUser(io, to, 'call-ended', { from, to });
        });

        socket.on('disconnect', () => {
            unregisterSocket(socket);
        });
    });

    console.log('[socket] click-to-call signaling ready');
}
