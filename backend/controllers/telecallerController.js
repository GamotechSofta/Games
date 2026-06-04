import mongoose from 'mongoose';
import User from '../models/user/user.js';
import Admin from '../models/admin/admin.js';
import Payment from '../models/payment/payment.js';
import Bet from '../models/bet/bet.js';
import { WalletTransaction } from '../models/wallet/wallet.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/** Max players shown in telecaller app (same cap as dashboard query). */
export const TELECALLER_PLAYER_LIMIT = 2000;

/** Players a telecaller can mark done (all users, capped to dashboard limit). */
export async function getTelecallerAssignablePlayerCount() {
    const total = await User.countDocuments({ role: 'user' });
    return Math.min(total, TELECALLER_PLAYER_LIMIT);
}

async function aggregateLastPayments(userIds, type) {
    if (!userIds.length) return {};
    const rows = await Payment.aggregate([
        { $match: { type, userId: { $in: userIds } } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$userId',
                amount: { $first: '$amount' },
                status: { $first: '$status' },
                method: { $first: '$method' },
                createdAt: { $first: '$createdAt' },
            },
        },
    ]);
    return Object.fromEntries(
        rows.map((r) => [
            String(r._id),
            {
                amount: r.amount,
                status: r.status,
                method: r.method,
                createdAt: r.createdAt,
            },
        ]),
    );
}

async function aggregateLastWalletTx(userIds, txType) {
    if (!userIds.length) return {};
    const rows = await WalletTransaction.aggregate([
        { $match: { type: txType, userId: { $in: userIds } } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$userId',
                amount: { $first: '$amount' },
                description: { $first: '$description' },
                createdAt: { $first: '$createdAt' },
            },
        },
    ]);
    return Object.fromEntries(
        rows.map((r) => [
            String(r._id),
            {
                amount: r.amount,
                description: r.description || null,
                createdAt: r.createdAt,
            },
        ]),
    );
}

async function aggregateLastBets(userIds) {
    if (!userIds.length) return {};
    const rows = await Bet.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$userId',
                amount: { $first: '$amount' },
                betNumber: { $first: '$betNumber' },
                status: { $first: '$status' },
                createdAt: { $first: '$createdAt' },
                marketId: { $first: '$marketId' },
            },
        },
        {
            $lookup: {
                from: 'markets',
                localField: 'marketId',
                foreignField: '_id',
                as: 'market',
            },
        },
        { $unwind: { path: '$market', preserveNullAndEmptyArrays: true } },
    ]);
    return Object.fromEntries(
        rows.map((r) => [
            String(r._id),
            {
                amount: r.amount,
                betNumber: r.betNumber,
                status: r.status,
                createdAt: r.createdAt,
                marketName: r.market?.marketName || null,
            },
        ]),
    );
}

/**
 * Telecaller dashboard: player contact + activity only (no wallet balance, credentials, or IPs).
 */
export const getTelecallerDashboard = async (req, res) => {
    try {
        const bookieUserIds = await getBookieUserIds(req.admin);
        const query = { role: 'user' };
        if (bookieUserIds !== null) {
            query._id = { $in: bookieUserIds };
        }

        const search = String(req.query.search || '').trim().toLowerCase();
        const users = await User.find(query)
            .select('username phone isActive isBlocked lastActiveAt createdAt')
            .sort({ createdAt: -1 })
            .limit(TELECALLER_PLAYER_LIMIT)
            .lean();

        const filteredUsers = search
            ? users.filter((u) => {
                const phone = String(u.phone || '');
                return (
                    (u.username || '').toLowerCase().includes(search)
                    || phone.includes(search)
                );
            })
            : users;

        const userIds = filteredUsers.map((u) => u._id);
        const [lastDeposit, lastWithdrawal, lastBet, lastWalletCredit, lastWalletDebit] = await Promise.all([
            aggregateLastPayments(userIds, 'deposit'),
            aggregateLastPayments(userIds, 'withdrawal'),
            aggregateLastBets(userIds),
            aggregateLastWalletTx(userIds, 'credit'),
            aggregateLastWalletTx(userIds, 'debit'),
        ]);

        const now = Date.now();
        const data = filteredUsers.map((user) => {
            const id = String(user._id);
            const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
            const isOnline = lastActive > 0 && now - lastActive < ONLINE_THRESHOLD_MS;
            return {
                _id: user._id,
                username: user.username,
                phone: user.phone,
                isActive: user.isActive,
                isBlocked: user.isBlocked,
                lastActiveAt: user.lastActiveAt,
                createdAt: user.createdAt,
                isOnline,
                lastDeposit: lastDeposit[id] || null,
                lastWithdrawal: lastWithdrawal[id] || null,
                lastBet: lastBet[id] || null,
                lastWalletCredit: lastWalletCredit[id] || null,
                lastWalletDebit: lastWalletDebit[id] || null,
            };
        });

        res.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=40');
        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const CALL_SUMMARY_MAX_LEN = 2000;

export function mapSummariesToObject(mapOrObj) {
    if (!mapOrObj) return {};
    if (mapOrObj instanceof Map) {
        return Object.fromEntries([...mapOrObj.entries()].map(([k, v]) => [String(k), String(v ?? '')]));
    }
    if (typeof mapOrObj === 'object') {
        return Object.fromEntries(
            Object.entries(mapOrObj).map(([k, v]) => [String(k), String(v ?? '')]),
        );
    }
    return {};
}

function normalizeSummariesPayload(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        const id = String(key || '').trim();
        if (!mongoose.Types.ObjectId.isValid(id)) continue;
        const text = String(value ?? '').trim().slice(0, CALL_SUMMARY_MAX_LEN);
        if (text) out[id] = text;
    }
    return out;
}

function normalizePlayerIdList(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const id of raw) {
        const s = String(id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(s) || seen.has(s)) continue;
        seen.add(s);
        out.push(new mongoose.Types.ObjectId(s));
    }
    return out;
}

/** Telecaller: load marked-as-called player IDs (once per session / page load). */
export const getMyCalledPlayers = async (req, res) => {
    try {
        if (req.admin?.role !== 'telecaller') {
            return res.status(403).json({
                success: false,
                message: 'Only telecaller accounts can sync call progress',
            });
        }
        const doc = await Admin.findById(req.admin._id)
            .select('calledPlayerIds calledPlayersUpdatedAt playerCallSummaries')
            .lean();
        const playerIds = (doc?.calledPlayerIds || []).map((id) => String(id));
        const summaries = mapSummariesToObject(doc?.playerCallSummaries);
        res.status(200).json({
            success: true,
            data: {
                playerIds,
                summaries,
                count: playerIds.length,
                updatedAt: doc?.calledPlayersUpdatedAt || null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** Telecaller: save full list of called player IDs (no polling — save on tick/clear only). */
export const setMyCalledPlayers = async (req, res) => {
    try {
        if (req.admin?.role !== 'telecaller') {
            return res.status(403).json({
                success: false,
                message: 'Only telecaller accounts can sync call progress',
            });
        }
        const ids = normalizePlayerIdList(req.body?.playerIds);
        const telecaller = await Admin.findOne({ _id: req.admin._id, role: 'telecaller' });
        if (!telecaller) {
            return res.status(404).json({
                success: false,
                message: 'Telecaller account not found',
            });
        }
        telecaller.calledPlayerIds = ids;
        if (req.body?.summaries !== undefined) {
            if (!telecaller.playerCallSummaries) {
                telecaller.playerCallSummaries = new Map();
            }
            for (const [key, value] of Object.entries(req.body.summaries || {})) {
                const id = String(key || '').trim();
                if (!mongoose.Types.ObjectId.isValid(id)) continue;
                const text = String(value ?? '').trim().slice(0, CALL_SUMMARY_MAX_LEN);
                if (text) telecaller.playerCallSummaries.set(id, text);
                else telecaller.playerCallSummaries.delete(id);
            }
        }
        telecaller.calledPlayersUpdatedAt = new Date();
        await telecaller.save();

        res.status(200).json({
            success: true,
            data: {
                playerIds: ids.map((id) => String(id)),
                summaries: mapSummariesToObject(telecaller.playerCallSummaries),
                count: ids.length,
                updatedAt: telecaller.calledPlayersUpdatedAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
