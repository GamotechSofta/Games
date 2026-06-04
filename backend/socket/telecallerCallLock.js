/**
 * One active outbound call per telecaller; one incoming call per user at a time.
 */

/** telecallerId -> { userId, startedAt } */
const telecallerActive = new Map();
/** userId -> telecallerId */
const userOnCallWith = new Map();

export function isTelecallerOnCall(telecallerId) {
    return telecallerActive.has(String(telecallerId || '').trim());
}

export function getTelecallerActiveUser(telecallerId) {
    return telecallerActive.get(String(telecallerId || '').trim())?.userId || null;
}

export function isUserOnCall(userId) {
    return userOnCallWith.has(String(userId || '').trim());
}

export function getUserTelecaller(userId) {
    return userOnCallWith.get(String(userId || '').trim()) || null;
}

export function lockCall(telecallerId, userId) {
    const tc = String(telecallerId || '').trim();
    const uid = String(userId || '').trim();
    if (!tc || !uid) return false;

    if (telecallerActive.has(tc)) return false;
    if (userOnCallWith.has(uid)) return false;

    telecallerActive.set(tc, { userId: uid, startedAt: Date.now() });
    userOnCallWith.set(uid, tc);
    return true;
}

export function unlockTelecaller(telecallerId) {
    const tc = String(telecallerId || '').trim();
    const entry = telecallerActive.get(tc);
    if (entry) {
        userOnCallWith.delete(entry.userId);
        telecallerActive.delete(tc);
    }
}

export function unlockUser(userId) {
    const uid = String(userId || '').trim();
    const tc = userOnCallWith.get(uid);
    if (tc) {
        telecallerActive.delete(tc);
        userOnCallWith.delete(uid);
    }
}

export function unlockPair(telecallerId, userId) {
    const tc = String(telecallerId || '').trim();
    const uid = String(userId || '').trim();
    if (telecallerActive.get(tc)?.userId === uid) {
        unlockTelecaller(tc);
    }
}
