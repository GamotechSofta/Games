import crypto from 'crypto';

/** @type {Map<string, { callId, userId, from, callerName, offer, createdAt, expiresAt }>} */
const byCallId = new Map();
/** @type {Map<string, string>} userId -> callId */
const activeByUser = new Map();

const TTL_MS = 120_000;

function newCallId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Store incoming WebRTC offer for offline / push wake-up flow.
 * @returns {string} callId
 */
export function storePendingIncomingCall({ userId, from, callerName, offer }) {
    const uid = String(userId || '').trim();
    const prev = activeByUser.get(uid);
    if (prev) byCallId.delete(prev);

    const callId = newCallId();
    const entry = {
        callId,
        userId: uid,
        from: String(from || '').trim(),
        callerName: String(callerName || 'Aakda.in').trim(),
        offer,
        createdAt: Date.now(),
        expiresAt: Date.now() + TTL_MS,
    };
    byCallId.set(callId, entry);
    activeByUser.set(uid, callId);
    return callId;
}

export function getPendingCall(callId) {
    const entry = byCallId.get(String(callId || '').trim());
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        removePendingCall(callId);
        return null;
    }
    return entry;
}

export function getPendingCallForUser(userId) {
    const id = activeByUser.get(String(userId || '').trim());
    if (!id) return null;
    return getPendingCall(id);
}

export function removePendingCall(callId) {
    const entry = byCallId.get(String(callId || '').trim());
    if (entry) {
        activeByUser.delete(entry.userId);
        byCallId.delete(entry.callId);
    }
    return entry || null;
}

export function removePendingForUser(userId) {
    const id = activeByUser.get(String(userId || '').trim());
    if (id) return removePendingCall(id);
    return null;
}
