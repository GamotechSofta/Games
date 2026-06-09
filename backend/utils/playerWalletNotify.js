import mongoose from 'mongoose';
import { Wallet } from '../models/wallet/wallet.js';
import { emitUserWalletUpdate } from '../socket/walletSocketBridge.js';
import { isMongoTimeoutError } from './mongoErrors.js';

/**
 * Emit realtime wallet balance to the player's subscribed socket(s).
 * @param {string|ObjectId} userId
 * @param {string} reason
 * @param {number|null} balanceOverride - skip DB read when caller already has balance
 */
export async function notifyPlayerWalletBalance(userId, reason = 'wallet_updated', balanceOverride = null) {
    try {
        if (userId == null) return;
        const uid =
            typeof userId === 'string'
                ? userId.trim()
                : typeof userId?.toString === 'function'
                    ? String(userId)
                    : '';
        if (!uid || !mongoose.Types.ObjectId.isValid(uid)) return;

        let balance = balanceOverride != null ? Number(balanceOverride) : NaN;
        if (!Number.isFinite(balance)) {
            const w = await Wallet.findOne({ userId: uid }).select('balance').lean();
            balance = Number(w?.balance ?? 0);
        }
        if (!Number.isFinite(balance)) return;
        emitUserWalletUpdate({ userId: uid, balance, reason });
    } catch (err) {
        if (isMongoTimeoutError(err)) {
            console.warn('[wallet] notify skipped (db busy):', reason);
            return;
        }
        console.error('[wallet] notify failed:', err?.message || err);
    }
}
