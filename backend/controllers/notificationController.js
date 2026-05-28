import mongoose from 'mongoose';
import Payment from '../models/payment/payment.js';
import HelpDesk from '../models/helpDesk/helpDesk.js';
import Bet from '../models/bet/bet.js';
import Market from '../models/market/market.js';
import MarketResult from '../models/marketResult/marketResult.js';
import { ensureResultsResetForNewDay } from '../utils/resultReset.js';

const toDateKeyIST = (d = new Date()) => {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(d);
    } catch {
        return '';
    }
};

const toMarketId = (v) => (v == null ? '' : String(v && typeof v === 'object' && v._id != null ? v._id : v));

export async function calculateUnreadNotificationCount({ userId, lastSeenAt = 0 }) {
    const now = new Date();
    const todayKey = toDateKeyIST(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKeyIST(yesterday);

    await ensureResultsResetForNewDay(Market);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [deposits, withdrawals, tickets, bets, markets, storedYesterday] = await Promise.all([
        Payment.find({ userId, type: 'deposit' })
            .select('processedAt updatedAt createdAt')
            .sort({ createdAt: -1 })
            .limit(25)
            .lean(),
        Payment.find({ userId, type: 'withdrawal' })
            .select('processedAt updatedAt createdAt')
            .sort({ createdAt: -1 })
            .limit(25)
            .lean(),
        HelpDesk.find({ userId })
            .select('updatedAt createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),
        Bet.find({ userId, createdAt: { $gte: thirtyDaysAgo } })
            .select('marketId')
            .limit(500)
            .lean(),
        Market.find({ marketType: 'main' })
            .select('marketName')
            .sort({ startingTime: 1 })
            .lean(),
        todayKey !== yesterdayKey
            ? MarketResult.find({ dateKey: yesterdayKey })
                .select('marketId marketName')
                .lean()
            : Promise.resolve([]),
    ]);

    const betMarketIds = new Set(bets.map((b) => toMarketId(b.marketId)).filter(Boolean));
    const list = [];

    const addResultEntry = (marketId, marketName, dateKey) => {
        const marketIdStr = toMarketId(marketId);
        if (!marketIdStr || !betMarketIds.has(marketIdStr)) return;
        const name = (marketName || '').toString().trim();
        if (!name) return;
        list.push({ dateKey, type: 'result' });
    };

    deposits.forEach((d) => list.push({ time: d.processedAt || d.updatedAt || d.createdAt }));
    withdrawals.forEach((w) => list.push({ time: w.processedAt || w.updatedAt || w.createdAt }));
    tickets.forEach((t) => list.push({ time: t.updatedAt || t.createdAt }));
    (markets || []).forEach((m) => addResultEntry(m._id, m.marketName, todayKey));
    (storedYesterday || []).forEach((r) => addResultEntry(r.marketId, r.marketName, yesterdayKey));

    const effectiveTime = (item) => {
        if (item.type === 'result' && item.dateKey) {
            try {
                return new Date(`${item.dateKey}T00:00:00+05:30`).getTime();
            } catch {
                return new Date(item.time || 0).getTime();
            }
        }
        return new Date(item.time || 0).getTime();
    };

    return list.filter((item) => effectiveTime(item) > lastSeenAt).length;
}

/**
 * GET /api/v1/notifications/unread-count?userId=&lastSeenAt=
 * Lightweight badge count — replaces 6 separate frontend fetches.
 */
export const getUnreadNotificationCount = async (req, res) => {
    try {
        const { userId } = req.query;
        const lastSeenRaw = req.query.lastSeenAt;
        const lastSeenAt = lastSeenRaw ? Number.parseInt(String(lastSeenRaw), 10) : 0;
        const lastSeen = Number.isFinite(lastSeenAt) ? lastSeenAt : 0;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }

        const count = await calculateUnreadNotificationCount({ userId, lastSeenAt: lastSeen });

        res.set('Cache-Control', 'private, max-age=30');
        return res.status(200).json({ success: true, data: { count } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
