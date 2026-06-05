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
import { storePendingIncomingCall, removePendingForUser } from './pendingCallStore.js';
import { sendIncomingCallPush } from '../services/callPushService.js';
import {
    lockCall,
    unlockPair,
    unlockTelecaller,
    unlockUser,
    isTelecallerOnCall,
    isUserOnCall,
    getTelecallerActiveUser,
} from './telecallerCallLock.js';

/** @type {import('socket.io').Server | null} */
let ioRef = null;

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

/** Route signaling to a user (e.g. reject from push while app closed). */
export function routeCallEventToUser(userId, event, data) {
    if (!ioRef) return false;
    return emitToUser(ioRef, userId, event, data);
}

export function isUserOnline(userId) {
    return Boolean(getSocketIdForUser(userId));
}

/** Remove queued callback request and notify telecaller dashboards. */
export function cancelCallRequestForUser(userId) {
    const id = String(userId || '').trim();
    if (!id) return false;
    removeCallRequest(id);
    if (ioRef) {
        ioRef.to('telecallers').emit('call-request-removed', { userId: id });
    }
    return true;
}

function unregisterSocket(socket) {
    const meta = socketMeta.get(socket.id);
    if (meta?.userId) {
        const current = userIdToSocket.get(meta.userId);
        if (current === socket.id) userIdToSocket.delete(meta.userId);
        if (meta.role === 'telecaller') {
            unlockTelecaller(meta.userId);
        } else {
            unlockUser(meta.userId);
        }
    }
    socketMeta.delete(socket.id);
}

/**
 * Attach call signaling handlers to the shared Socket.IO server.
 * @param {import('socket.io').Server} io
 */
export function initCallSocket(io) {
    ioRef = io;
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
                issue: data.issue || data.description || '',
            });

            if (!entry) {
                socket.emit('call-request-error', {
                    message: 'Please describe your issue before requesting a call',
                });
                return;
            }

            io.to('telecallers').emit('new-call-request', entry);
            socket.emit('call-request-ack', { ok: true, request: entry });
        });

        /** User cancelled their callback request before telecaller called */
        socket.on('cancel-call-request', (data = {}) => {
            const meta = socketMeta.get(socket.id);
            const userId = String(data.userId || meta?.userId || '').trim();
            if (!userId) return;
            cancelCallRequestForUser(userId);
            socket.emit('call-request-cancelled', { ok: true, userId });
        });

        /** Telecaller starts WebRTC call to user */
        socket.on('call-user', async (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            const offer = data.offer;
            if (!from || !to || !offer) return;

            if (isTelecallerOnCall(from)) {
                const activeUser = getTelecallerActiveUser(from);
                if (activeUser !== to) {
                    socket.emit('call-busy', {
                        message: 'You are already on a call. End it before starting another.',
                        activeUserId: activeUser,
                    });
                    return;
                }
            }

            if (isUserOnCall(to)) {
                socket.emit('user-busy', {
                    userId: to,
                    message: 'This player is already on a call.',
                });
                return;
            }

            if (!lockCall(from, to)) {
                socket.emit('call-busy', {
                    message: 'Could not start call — line busy. Try again in a moment.',
                });
                return;
            }

            removeCallRequest(to);

            const callerName = data.callerName || 'Aakda.in';
            const callId = storePendingIncomingCall({
                userId: to,
                from,
                callerName,
                offer,
            });

            const incomingPayload = {
                callId,
                from,
                to,
                offer,
                callerName,
            };

            const delivered = emitToUser(io, to, 'incoming-call', incomingPayload);

            // Web Push: ring when tab closed / phone locked (no Firebase — standard VAPID)
            let pushSent = false;
            try {
                const pushResult = await sendIncomingCallPush({
                    userId: to,
                    callId,
                    callerName,
                });
                pushSent = (pushResult?.sent || 0) > 0;
            } catch (err) {
                console.error('[push] incoming call notify failed:', err.message);
            }

            if (!delivered) {
                if (!pushSent) {
                    unlockPair(from, to);
                }
                socket.emit('user-unavailable', {
                    userId: to,
                    reason: pushSent ? 'not-connected' : 'offline',
                    pushSent,
                    callId,
                });
            }
            io.to('telecallers').emit('call-request-removed', { userId: to });
        });

        socket.on('answer-call', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            const answer = data.answer;
            if (!from || !to || !answer) return;
            removePendingForUser(from);
            emitToUser(io, to, 'call-answered', { from, to, answer });
        });

        socket.on('reject-call', (data = {}) => {
            const from = String(data.from || socket.data.userId || '').trim();
            const to = String(data.to || '').trim();
            if (!from || !to) return;
            removePendingForUser(from);
            unlockPair(to, from);
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
            unlockPair(from, to);
            unlockPair(to, from);
            emitToUser(io, to, 'call-ended', { from, to });
        });

        socket.on('disconnect', () => {
            unregisterSocket(socket);
        });
    });

    console.log('[socket] click-to-call signaling ready');
}
