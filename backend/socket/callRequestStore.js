/**
 * In-memory pending call requests (user asked telecaller to call them).
 * Each entry: { id, userId, name, phone, createdAt }
 */

const pending = new Map();

export function addCallRequest({ userId, name, phone }) {
    const uid = String(userId || '').trim();
    if (!uid) return null;

    // One active request per user — replace previous
    const id = `cr_${uid}_${Date.now()}`;
    const entry = {
        id,
        userId: uid,
        name: String(name || 'Player').trim() || 'Player',
        phone: String(phone || '').trim(),
        createdAt: new Date().toISOString(),
    };
    pending.set(uid, entry);
    return entry;
}

export function removeCallRequest(userId) {
    pending.delete(String(userId || '').trim());
}

export function getCallRequest(userId) {
    return pending.get(String(userId || '').trim()) || null;
}

export function listCallRequests() {
    return [...pending.values()].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
}

export function clearAllCallRequests() {
    pending.clear();
}
