import Bet from '../models/bet/bet.js';
import Payment from '../models/payment/payment.js';
import User from '../models/user/user.js';
import DailyStats from '../models/stats/dailyStats.js';
import { getTodayIST, addDaysToIstDateKey } from './resultReset.js';

/** IST calendar day boundaries (matches market midnight reset). */
export function dateKeyToRange(dateKey) {
    const start = new Date(`${dateKey}T00:00:00+05:30`);
    const end = new Date(`${dateKey}T23:59:59.999+05:30`);
    return { start, end, dateMatch: { createdAt: { $gte: start, $lte: end } } };
}

/** IST date key for the business day that ended at the most recent midnight IST. */
export function getYesterdayStatsDateKey(now = new Date()) {
    return addDaysToIstDateKey(getTodayIST(now), -1);
}

/** @deprecated use getYesterdayStatsDateKey — kept for manual UTC backfills */
export function getYesterdayUtcDateKey(now = new Date()) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

export function isCompletePastStatsDay(dateKey, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
    return dateKey < getTodayIST();
}

/**
 * Aggregate and upsert platform daily stats for one UTC date (YYYY-MM-DD).
 */
export async function computeDailyStatsForDate(dateKey) {
    const { dateMatch } = dateKeyToRange(dateKey);
    const revenueFilter = { ...dateMatch, status: { $ne: 'cancelled' } };
    const wonFilter = { status: 'won', ...dateMatch };

    const [betFacet, paymentFacet, newUsers] = await Promise.all([
        Bet.aggregate([
            { $match: dateMatch },
            {
                $facet: {
                    revenue: [
                        { $match: { status: { $ne: 'cancelled' } } },
                        { $group: { _id: null, total: { $sum: '$amount' } } },
                    ],
                    payouts: [
                        { $match: { status: 'won' } },
                        { $group: { _id: null, total: { $sum: '$payout' } } },
                    ],
                    totalBets: [{ $match: revenueFilter }, { $count: 'n' }],
                    winningBets: [{ $match: wonFilter }, { $count: 'n' }],
                    losingBets: [{ $match: { status: 'lost', ...dateMatch } }, { $count: 'n' }],
                },
            },
        ]),
        Payment.aggregate([
            {
                $facet: {
                    deposits: [
                        {
                            $match: {
                                type: 'deposit',
                                status: { $in: ['approved', 'completed'] },
                                ...dateMatch,
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$amount' } } },
                    ],
                    withdrawals: [
                        {
                            $match: {
                                type: 'withdrawal',
                                status: { $in: ['approved', 'completed'] },
                                ...dateMatch,
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$amount' } } },
                    ],
                },
            },
        ]),
        User.countDocuments(dateMatch),
    ]);

    const betRow = betFacet[0] || {};
    const payRow = paymentFacet[0] || {};

    const payload = {
        dateKey,
        betRevenue: betRow.revenue?.[0]?.total || 0,
        betPayouts: betRow.payouts?.[0]?.total || 0,
        betCount: betRow.totalBets?.[0]?.n || 0,
        winningBets: betRow.winningBets?.[0]?.n || 0,
        losingBets: betRow.losingBets?.[0]?.n || 0,
        totalDeposits: payRow.deposits?.[0]?.total || 0,
        totalWithdrawals: payRow.withdrawals?.[0]?.total || 0,
        newUsers,
        computedAt: new Date(),
    };

    const doc = await DailyStats.findOneAndUpdate(
        { dateKey },
        { $set: payload },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();

    return doc;
}

export async function getMaterializedReportForDay(dateKey) {
    if (!isCompletePastStatsDay(dateKey)) return null;
    return DailyStats.findOne({ dateKey }).lean();
}
