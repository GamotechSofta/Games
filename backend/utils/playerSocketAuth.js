import mongoose from 'mongoose';
import User from '../models/user/user.js';

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
  const user = await User.findById(userId).select('isActive').lean();
  if (!user || !user.isActive) return { code: 'AUTH_REQUIRED' };
  return { userId: String(userId) };
}
