/**
 * In-memory pending call requests (user asked telecaller to call them).
 * Each entry: { id, userId, name, phone, issue, createdAt }
 */

const pending = new Map();

const MAX_ISSUE_LEN = 500;

export function normalizeCallRequestIssue(raw) {
    return String(raw || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, MAX_ISSUE_LEN);
}

export function addCallRequest({ userId, name, phone, issue }) {
    const uid = String(userId || '').trim();
    if (!uid) return null;

    const normalizedIssue = normalizeCallRequestIssue(issue);
    if (!normalizedIssue) return null;

    // One active request per user — replace previous
    const id = `cr_${uid}_${Date.now()}`;
    const entry = {
        id,
        userId: uid,
        name: String(name || 'Player').trim() || 'Player',
        phone: String(phone || '').trim(),
        issue: normalizedIssue,
        createdAt: new Date().toISOString(),
    };
    pending.set(uid, entry);
    return entry;
}

export function removeCallRequest(userId) {
    const uid = String(userId || '').trim();
    const existed = pending.has(uid);
    pending.delete(uid);
    return existed;
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
