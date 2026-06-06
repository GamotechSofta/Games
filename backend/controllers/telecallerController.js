import mongoose from 'mongoose';
import User from '../models/user/user.js';
import Admin from '../models/admin/admin.js';
import Payment from '../models/payment/payment.js';
import Bet from '../models/bet/bet.js';
import { WalletTransaction } from '../models/wallet/wallet.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/** Legacy cap for telecaller assignable-player counts in admin APIs. */
export const TELECALLER_PLAYER_LIMIT = 2000;

export const TELECALLER_PLAYER_PAGE_SIZE = 50;
export const TELECALLER_PLAYER_PAGE_MAX = 100;

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

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTelecallerUserQuery(bookieUserIds, search) {
    const query = { role: 'user' };
    if (bookieUserIds !== null) {
        query._id = { $in: bookieUserIds };
    }
    const term = String(search || '').trim();
    if (term) {
        const pattern = escapeRegex(term);
        query.$or = [
            { username: { $regex: pattern, $options: 'i' } },
            { phone: { $regex: pattern, $options: 'i' } },
        ];
    }
    return query;
}

function sortDashboardRows(rows, sortBy) {
    const ts = (d) => (d ? new Date(d).getTime() : 0);
    const sorted = [...rows];
    sorted.sort((a, b) => {
        if (sortBy === 'name_asc') {
            return String(a.username || '').localeCompare(String(b.username || ''), undefined, { sensitivity: 'base' });
        }
        if (sortBy === 'last_deposit_desc') {
            return ts(b.lastDeposit?.createdAt) - ts(a.lastDeposit?.createdAt);
        }
        if (sortBy === 'last_withdraw_desc') {
            return ts(b.lastWithdrawal?.createdAt) - ts(a.lastWithdrawal?.createdAt);
        }
        if (sortBy === 'last_wallet_add_desc') {
            return ts(b.lastWalletCredit?.createdAt) - ts(a.lastWalletCredit?.createdAt);
        }
        if (sortBy === 'last_wallet_deduct_desc') {
            return ts(b.lastWalletDebit?.createdAt) - ts(a.lastWalletDebit?.createdAt);
        }
        if (sortBy === 'last_bet_desc') {
            return ts(b.lastBet?.createdAt) - ts(a.lastBet?.createdAt);
        }
        return ts(b.createdAt) - ts(a.createdAt);
    });
    return sorted;
}

async function countDistinctActivityUsers(Model, match, bookieUserIds) {
    const pipeline = [{ $match: match }];
    if (bookieUserIds !== null) {
        pipeline.push({ $match: { userId: { $in: bookieUserIds } } });
    }
    pipeline.push({ $group: { _id: '$userId' } }, { $count: 'count' });
    const rows = await Model.aggregate(pipeline);
    return rows[0]?.count ?? 0;
}

function mapUserRow(user, activityMaps, now) {
    const id = String(user._id);
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    const isOnline = lastActive > 0 && now - lastActive < ONLINE_THRESHOLD_MS;
    const {
        lastDeposit,
        lastWithdrawal,
        lastBet,
        lastWalletCredit,
        lastWalletDebit,
    } = activityMaps;
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
}

/**
 * Telecaller dashboard: paginated player contact + activity (no wallet balance, credentials, or IPs).
 */
export const getTelecallerDashboard = async (req, res) => {
    try {
        const bookieUserIds = await getBookieUserIds(req.admin);
        const baseQuery = buildTelecallerUserQuery(bookieUserIds, '');
        const search = String(req.query.search || '').trim();
        const listQuery = buildTelecallerUserQuery(bookieUserIds, search);
        const sortBy = String(req.query.sort || 'last_deposit_desc');
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            TELECALLER_PLAYER_PAGE_MAX,
            Math.max(1, parseInt(req.query.limit, 10) || TELECALLER_PLAYER_PAGE_SIZE),
        );
        const skip = (page - 1) * limit;
        const now = Date.now();
        const onlineSince = new Date(now - ONLINE_THRESHOLD_MS);

        const [
            totalPlayers,
            listTotal,
            users,
            onlineCount,
            withDeposit,
            withWithdrawal,
            withWalletCredit,
            withBet,
            onlineUsers,
        ] = await Promise.all([
            User.countDocuments(baseQuery),
            User.countDocuments(listQuery),
            User.find(listQuery)
                .select('username phone isActive isBlocked lastActiveAt createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments({ ...baseQuery, lastActiveAt: { $gte: onlineSince } }),
            countDistinctActivityUsers(Payment, { type: 'deposit' }, bookieUserIds),
            countDistinctActivityUsers(Payment, { type: 'withdrawal' }, bookieUserIds),
            countDistinctActivityUsers(WalletTransaction, { type: 'credit' }, bookieUserIds),
            countDistinctActivityUsers(Bet, {}, bookieUserIds),
            User.find({ ...baseQuery, lastActiveAt: { $gte: onlineSince } })
                .select('username phone isActive isBlocked lastActiveAt createdAt')
                .sort({ lastActiveAt: -1 })
                .limit(8)
                .lean(),
        ]);

        const userIds = users.map((u) => u._id);
        const [lastDeposit, lastWithdrawal, lastBet, lastWalletCredit, lastWalletDebit] = await Promise.all([
            aggregateLastPayments(userIds, 'deposit'),
            aggregateLastPayments(userIds, 'withdrawal'),
            aggregateLastBets(userIds),
            aggregateLastWalletTx(userIds, 'credit'),
            aggregateLastWalletTx(userIds, 'debit'),
        ]);
        const activityMaps = {
            lastDeposit,
            lastWithdrawal,
            lastBet,
            lastWalletCredit,
            lastWalletDebit,
        };

        const rows = users.map((user) => mapUserRow(user, activityMaps, now));
        const data = sortDashboardRows(rows, sortBy);
        const onlinePreview = onlineUsers.map((user) => mapUserRow(user, activityMaps, now));

        res.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=40');
        res.status(200).json({
            success: true,
            count: data.length,
            data,
            pagination: {
                page,
                limit,
                total: listTotal,
                totalPages: Math.max(1, Math.ceil(listTotal / limit)),
            },
            stats: {
                total: totalPlayers,
                online: onlineCount,
                withDeposit,
                withWithdrawal,
                withWalletCredit,
                withBet,
            },
            onlinePreview,
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
