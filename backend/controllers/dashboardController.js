import Bet from '../models/bet/bet.js';
import Payment from '../models/payment/payment.js';
import User from '../models/user/user.js';
import Market from '../models/market/market.js';
import Admin from '../models/admin/admin.js';

import { Wallet } from '../models/wallet/wallet.js';
import HelpDesk from '../models/helpDesk/helpDesk.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';
import { isBettingClosed } from '../utils/marketTiming.js';
import { appCacheGet, appCacheSet, appCacheDelByPrefix, isRedisCacheEnabled } from '../utils/appCache.js';
import { sumManualWalletDeposits, sumManualWalletWithdrawals } from '../utils/paymentStatsAggregation.js';

const DASHBOARD_CACHE_PREFIX = 'dashboard:';
const DASHBOARD_CACHE_TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS || 30_000);

export async function invalidateDashboardCache() {
    await appCacheDelByPrefix(DASHBOARD_CACHE_PREFIX);
}

function dashboardCacheKey(admin, query) {
    const id = String(admin?._id || '');
    const role = admin?.role || '';
    const { from = '', to = '', all = '' } = query;
    return `${id}:${role}:${all}:${from}:${to}`;
}

/** Parse from/to query (YYYY-MM-DD). If all=1 or from=all, returns null (all-time). Default to today if from/to missing. */
function getDateRange(fromStr, toStr, allTime) {
    if (allTime || fromStr === 'all' || toStr === 'all') {
        return { start: null, end: null };
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(today);
    let end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    if (fromStr && toStr) {
        const [y1, m1, d1] = fromStr.split('-').map(Number);
        const [y2, m2, d2] = toStr.split('-').map(Number);
        if (!Number.isNaN(y1) && !Number.isNaN(m1) && !Number.isNaN(d1)) {
            start = new Date(y1, m1 - 1, d1);
        }
        if (!Number.isNaN(y2) && !Number.isNaN(m2) && !Number.isNaN(d2)) {
            end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999);
        }
    }
    return { start, end };
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [hour, min] = timeStr.split(':').map(Number);
    if (hour >= 0 && hour < 24 && min >= 0 && min < 60) {
        return hour * 60 + min;
    }
    return null;
}

function facetCount(rows, key) {
    return rows?.[key]?.[0]?.n ?? 0;
}

function facetSum(rows, key) {
    return rows?.[key]?.[0]?.total ?? 0;
}

async function aggregateUserCounts(userFilter, dateMatch) {
    const [row] = await User.aggregate([
        {
            $facet: {
                total: [{ $match: userFilter }, { $count: 'n' }],
                active: [{ $match: { ...userFilter, isActive: true } }, { $count: 'n' }],
                newInRange: [{ $match: { ...userFilter, ...dateMatch } }, { $count: 'n' }],
            },
        },
    ]);
    return {
        total: facetCount(row, 'total'),
        active: facetCount(row, 'active'),
        newInRange: facetCount(row, 'newInRange'),
    };
}

async function aggregateMarketCounts() {
    const [row] = await Market.aggregate([
        {
            $facet: {
                total: [{ $count: 'n' }],
                main: [{ $match: { marketType: { $ne: 'startline' } } }, { $count: 'n' }],
                starline: [{ $match: { marketType: 'startline' } }, { $count: 'n' }],
            },
        },
    ]);
    return {
        total: facetCount(row, 'total'),
        main: facetCount(row, 'main'),
        starline: facetCount(row, 'starline'),
    };
}

async function aggregateBetStats(betMatchNoCancelled, dateMatch, betFilter) {
    const wonMatch = { status: 'won', ...dateMatch, ...betFilter };
    const lostMatch = { status: 'lost', ...dateMatch, ...betFilter };
    const pendingMatch = { status: 'pending', ...betFilter };

    const [row] = await Bet.aggregate([
        {
            $facet: {
                revenue: [
                    { $match: betMatchNoCancelled },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ],
                payouts: [
                    { $match: wonMatch },
                    { $group: { _id: null, total: { $sum: '$payout' } } },
                ],
                totalBets: [{ $match: betMatchNoCancelled }, { $count: 'n' }],
                winningBets: [{ $match: wonMatch }, { $count: 'n' }],
                losingBets: [{ $match: lostMatch }, { $count: 'n' }],
                pendingBets: [{ $match: pendingMatch }, { $count: 'n' }],
            },
        },
    ]);

    return {
        revenue: facetSum(row, 'revenue'),
        payouts: facetSum(row, 'payouts'),
        totalBets: facetCount(row, 'totalBets'),
        winningBets: facetCount(row, 'winningBets'),
        losingBets: facetCount(row, 'losingBets'),
        pendingBets: facetCount(row, 'pendingBets'),
    };
}

async function aggregatePaymentStats(paymentFilter, dateMatch) {
    const [row, manualDeposits, manualWithdrawals] = await Promise.all([
        Payment.aggregate([
            {
                $facet: {
                    deposits: [
                        {
                            $match: {
                                type: 'deposit',
                                status: { $in: ['approved', 'completed'] },
                                ...dateMatch,
                                ...paymentFilter,
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
                                ...paymentFilter,
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$amount' } } },
                    ],
                    totalPayments: [{ $match: paymentFilter }, { $count: 'n' }],
                    pendingDeposits: [
                        { $match: { type: 'deposit', status: 'pending', ...paymentFilter } },
                        { $count: 'n' },
                    ],
                },
            },
        ]),
        sumManualWalletDeposits(paymentFilter, dateMatch),
        sumManualWalletWithdrawals(paymentFilter, dateMatch),
    ]);

    return {
        totalDeposits: facetSum(row[0], 'deposits') + manualDeposits,
        totalWithdrawals: facetSum(row[0], 'withdrawals') + manualWithdrawals,
        totalPayments: facetCount(row[0], 'totalPayments'),
        pendingDeposits: facetCount(row[0], 'pendingDeposits'),
    };
}

async function aggregateHelpDeskCounts(helpDeskFilter) {
    const [row] = await HelpDesk.aggregate([
        {
            $facet: {
                total: [{ $match: helpDeskFilter }, { $count: 'n' }],
                open: [{ $match: { status: 'open', ...helpDeskFilter } }, { $count: 'n' }],
                inProgress: [{ $match: { status: 'in-progress', ...helpDeskFilter } }, { $count: 'n' }],
            },
        },
    ]);
    return {
        total: facetCount(row, 'total'),
        open: facetCount(row, 'open'),
        inProgress: facetCount(row, 'inProgress'),
    };
}

async function aggregateBookieAdminCounts() {
    const [row] = await Admin.aggregate([
        { $match: { role: 'bookie' } },
        {
            $facet: {
                total: [{ $count: 'n' }],
                active: [{ $match: { status: 'active' } }, { $count: 'n' }],
            },
        },
    ]);
    return {
        total: facetCount(row, 'total'),
        active: facetCount(row, 'active'),
    };
}

function computeMarketOpenStats(allMarketsForOpen, now) {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    let openMarkets = 0;
    let openMainMarkets = 0;
    let openStarlineMarkets = 0;
    const marketsPendingResultList = [];

    for (const m of allMarketsForOpen) {
        const startTime = parseTimeToMinutes(m.startingTime);
        const endTime = parseTimeToMinutes(m.closingTime);
        const isOpen = startTime != null && endTime != null && currentTime >= startTime && currentTime <= endTime;
        if (isOpen) {
            openMarkets++;
            if (m.marketType === 'startline') openStarlineMarkets++;
            else openMainMarkets++;
        }

        if (!isBettingClosed(m, now)) continue;
        const isStarline = m.marketType === 'startline';
        const needsResult = isStarline
            ? !(m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)))
            : !(m.openingNumber && /^\d{3}$/.test(String(m.openingNumber))
                && m.closingNumber && /^\d{3}$/.test(String(m.closingNumber)));
        if (needsResult) {
            marketsPendingResultList.push({
                _id: m._id,
                marketName: m.marketName,
                marketType: m.marketType || 'main',
            });
        }
    }

    return {
        openMarkets,
        openMainMarkets,
        openStarlineMarkets,
        marketsPendingResult: marketsPendingResultList.length,
        marketsPendingResultList,
    };
}

async function buildDashboardPayload(req) {
    const bookieUserIds = await getBookieUserIds(req.admin);
    const userFilter = bookieUserIds !== null ? { _id: { $in: bookieUserIds } } : {};
    const betFilter = bookieUserIds !== null ? { userId: { $in: bookieUserIds } } : {};
    const paymentFilter = bookieUserIds !== null ? { userId: { $in: bookieUserIds } } : {};
    const walletMatch = bookieUserIds !== null ? { userId: { $in: bookieUserIds } } : {};
    const helpDeskFilter = bookieUserIds !== null ? { userId: { $in: bookieUserIds } } : {};

    const { from, to, all } = req.query;
    const allTime = all === '1' || all === 'true';
    const { start: rangeStart, end: rangeEnd } = getDateRange(from, to, allTime);
    const dateMatch = rangeStart != null && rangeEnd != null
        ? { createdAt: { $gte: rangeStart, $lte: rangeEnd } }
        : {};

    const betMatchNoCancelled = { ...dateMatch, ...betFilter, status: { $ne: 'cancelled' } };
    const isSuperAdmin = bookieUserIds === null && req.admin?.role === 'super_admin';

    const [
        bookieCollectsBookies,
        userCounts,
        marketCounts,
        allMarketsForOpen,
        betStats,
        paymentStats,
        totalWalletBalance,
        helpDeskStats,
        bookieAdminCounts,
    ] = await Promise.all([
        isSuperAdmin
            ? Admin.find({ role: 'bookie', bookieType: 'bookie_collects' }).select('_id').lean()
            : Promise.resolve([]),
        aggregateUserCounts(userFilter, dateMatch),
        aggregateMarketCounts(),
        Market.find()
            .select('marketName marketType startingTime closingTime openingNumber closingNumber')
            .lean(),
        aggregateBetStats(betMatchNoCancelled, dateMatch, betFilter),
        aggregatePaymentStats(paymentFilter, dateMatch),
        Wallet.aggregate([
            ...(Object.keys(walletMatch).length ? [{ $match: walletMatch }] : []),
            { $group: { _id: null, total: { $sum: '$balance' } } },
        ]),
        aggregateHelpDeskCounts(helpDeskFilter),
        isSuperAdmin ? aggregateBookieAdminCounts() : Promise.resolve({ total: 0, active: 0 }),
    ]);

    const now = new Date();
    const marketOpenStats = computeMarketOpenStats(allMarketsForOpen, now);

    const withdrawalPendingFilter = { type: 'withdrawal', status: 'pending', ...paymentFilter };
    if (isSuperAdmin && bookieCollectsBookies.length > 0) {
        withdrawalPendingFilter.bookieId = { $nin: bookieCollectsBookies.map((b) => b._id) };
    }
    const pendingWithdrawals = await Payment.countDocuments(withdrawalPendingFilter);

    const revenue = betStats.revenue;
    const payouts = betStats.payouts;
    const totalBets = betStats.totalBets;
    const winningBets = betStats.winningBets;
    const netProfit = revenue - payouts;
    const winRate = totalBets > 0 ? ((winningBets / totalBets) * 100).toFixed(2) : 0;

    let bookieShare = null;
    let bookieNetProfit = null;
    let netProfitPercentage = null;
    if (req.admin?.role === 'bookie') {
        const bookieType = req.admin.bookieType || 'admin_collects';
        const commPct = req.admin.commissionPercentage || 0;

        if (bookieType === 'bookie_collects') {
            const platformCharge = Math.round((revenue * commPct / 100) * 100) / 100;
            bookieShare = Math.round((revenue - platformCharge) * 100) / 100;
            bookieNetProfit = Math.round((bookieShare - payouts) * 100) / 100;
        } else {
            bookieShare = Math.round((revenue * commPct / 100) * 100) / 100;
            bookieNetProfit = bookieShare;
        }

        if (revenue > 0) {
            netProfitPercentage = Math.round((bookieNetProfit / revenue) * 100 * 100) / 100;
        }
    }

    return {
        dateRange: rangeStart != null && rangeEnd != null
            ? { from: rangeStart.toISOString(), to: rangeEnd.toISOString() }
            : { all: true },
        users: {
            total: userCounts.total,
            active: userCounts.active,
            newToday: userCounts.newInRange,
            newThisWeek: userCounts.newInRange,
            newThisMonth: userCounts.newInRange,
        },
        markets: {
            total: marketCounts.total,
            open: marketOpenStats.openMarkets,
            main: marketCounts.main,
            starline: marketCounts.starline,
            openMain: marketOpenStats.openMainMarkets,
            openStarline: marketOpenStats.openStarlineMarkets,
        },
        revenue: {
            total: revenue,
            today: revenue,
            thisWeek: revenue,
            thisMonth: revenue,
            payouts,
            netProfit,
            bookieShare,
            bookieNetProfit,
            netProfitPercentage,
        },
        bets: {
            total: totalBets,
            today: totalBets,
            thisWeek: totalBets,
            thisMonth: totalBets,
            winning: winningBets,
            losing: betStats.losingBets,
            pending: betStats.pendingBets,
            winRate: parseFloat(winRate),
        },
        payments: {
            total: paymentStats.totalPayments,
            pending: pendingWithdrawals,
            pendingDeposits: paymentStats.pendingDeposits,
            pendingWithdrawals,
            totalDeposits: paymentStats.totalDeposits,
            totalWithdrawals: paymentStats.totalWithdrawals,
        },
        wallet: {
            totalBalance: totalWalletBalance[0]?.total || 0,
        },
        helpDesk: {
            total: helpDeskStats.total,
            open: helpDeskStats.open,
            inProgress: helpDeskStats.inProgress,
        },
        bookies: {
            total: bookieAdminCounts.total,
            active: bookieAdminCounts.active,
        },
        marketsPendingResult: marketOpenStats.marketsPendingResult,
        marketsPendingResultList: marketOpenStats.marketsPendingResultList,
    };
}

export const getDashboardStats = async (req, res) => {
    try {
        const skipCache = req.query._ != null && String(req.query._).trim() !== '';
        const cacheKey = dashboardCacheKey(req.admin, req.query);

        const storageKey = `${DASHBOARD_CACHE_PREFIX}${cacheKey}`;

        if (!skipCache) {
            const cached = await appCacheGet(storageKey);
            if (cached) {
                res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
                res.set('X-Dashboard-Cache', isRedisCacheEnabled() ? 'REDIS-HIT' : 'HIT');
                return res.status(200).json({ success: true, data: cached });
            }
        }

        const data = await buildDashboardPayload(req);

        if (!skipCache) {
            await appCacheSet(storageKey, data, DASHBOARD_CACHE_TTL_MS);
        }

        res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        res.set('X-Dashboard-Cache', skipCache ? 'BYPASS' : (isRedisCacheEnabled() ? 'REDIS-MISS' : 'MISS'));
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
