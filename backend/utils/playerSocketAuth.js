import mongoose from 'mongoose';
import User from '../models/user/user.js';

const ACTIVE_USER_CACHE_TTL_MS = 60 * 1000;
const ACTIVE_USER_CACHE_MAX = 2000;
const DB_LOOKUP_MS = 8000;

/** @type {Map<string, { isActive: boolean, at: number }>} */
const activeUserCache = new Map();

function pruneActiveUserCache(now = Date.now()) {
  for (const [key, value] of activeUserCache.entries()) {
    if (!value?.at || now - value.at >= ACTIVE_USER_CACHE_TTL_MS) {
      activeUserCache.delete(key);
    }
  }
  if (activeUserCache.size <= ACTIVE_USER_CACHE_MAX) return;
  const entries = [...activeUserCache.entries()].sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0));
  const overflow = activeUserCache.size - ACTIVE_USER_CACHE_MAX;
  for (let i = 0; i < overflow; i += 1) {
    activeUserCache.delete(entries[i][0]);
  }
}

/**
 * Resolve player for Socket.IO wallet:subscribe (Games uses userId in session, not JWT).
 * @param {{ userId?: string }} payload
 * @returns {Promise<{ userId: string } | { code: string }>}
 */
export async function resolveActivePlayerUserIdFromSubscribe(payload = {}) {
  const userId = String(payload?.userId || '').trim();
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { code: 'AUTH_REQUIRED' };
  }

  const now = Date.now();
  pruneActiveUserCache(now);
  const cached = activeUserCache.get(userId);
  if (cached && now - cached.at < ACTIVE_USER_CACHE_TTL_MS) {
    return cached.isActive ? { userId } : { code: 'AUTH_REQUIRED' };
  }

  try {
    const user = await User.findById(userId).select('isActive').maxTimeMS(DB_LOOKUP_MS).lean();
    const isActive = Boolean(user?.isActive);
    activeUserCache.set(userId, { isActive, at: now });
    if (!isActive) return { code: 'AUTH_REQUIRED' };
    return { userId };
  } catch (err) {
    if (cached?.isActive) {
      return { userId };
    }
    throw err;
  }
}
