import Admin from '../models/admin/admin.js';
import User from '../models/user/user.js';
import Bet from '../models/bet/bet.js';

export const parseSettlementDate = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

export const mapPaymentStatus = (status) => {
    if (!status) return 'unpaid';
    const s = String(status).toLowerCase();
    if (s === 'paid' || ['approved', 'payment_sent', 'bookie_confirmed'].includes(s)) return 'paid';
    return 'unpaid';
};

/** Current calendar date in IST (YYYY-MM-DD). */
export function getTodayIST() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/** True when that settlement date is before today (IST) — day is fully over. */
export function isSettlementDayEnded(dateStr) {
    if (!dateStr) return false;
    return dateStr < getTodayIST();
}

/**
 * Payment status for display + whether admin may mark paid.
 * Today (IST) with commission > 0 stays unpaid until midnight — more bets may come in.
 */
export function resolveSettlementPaymentStatus(settlement, commission, dateStr) {
    const comm = Number(commission) || 0;
    const dayEnded = isSettlementDayEnded(dateStr);
    if (comm === 0) {
        return { paymentStatus: 'paid', canMarkPaid: false, dayEnded };
    }
    if (!dayEnded) {
        return { paymentStatus: 'unpaid', canMarkPaid: false, dayEnded: false };
    }
    return {
        paymentStatus: mapPaymentStatus(settlement?.status),
        canMarkPaid: true,
        dayEnded: true,
    };
}

export const buildDateList = (startDate, endDate) => {
    if (!startDate || !endDate) return [];
    const from = new Date(startDate + 'T00:00:00.000Z');
    const to = new Date(endDate + 'T23:59:59.999Z');
    const dates = [];
    const d = new Date(from);
    while (d <= to) {
        dates.push(d.toISOString().slice(0, 10));
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates.sort((a, b) => b.localeCompare(a));
};

const betDateFilter = (startDate, endDate) => {
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    return dateFilter;
};

/** Daily bet volume + commission for one bookie's users. */
export async function computeBookieDailyCommission(bookie, userIds, startDate, endDate) {
    const commPct = Number(bookie.commissionPercentage) || 0;
    const dateFilter = betDateFilter(startDate, endDate);
    const aggMap = {};

    if (userIds.length > 0) {
        const dailyAgg = await Bet.aggregate([
            { $match: { ...dateFilter, userId: { $in: userIds }, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    totalBetAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ]);
        dailyAgg.forEach((row) => {
            const rev = row.totalBetAmount || 0;
            const commission = Math.round((rev * commPct / 100) * 100) / 100;
            aggMap[row._id] = {
                revenue: Math.round(rev * 100) / 100,
                commission,
                betCount: row.count || 0,
            };
        });
    }

    return buildDateList(startDate, endDate).map((date) => {
        const row = aggMap[date] || { revenue: 0, commission: 0, betCount: 0 };
        return { date, ...row };
    });
}

export async function getBookieUserIdsMap() {
    const allUsers = await User.find().select('_id referredBy').lean();
    const bookieUserMap = {};
    for (const u of allUsers) {
        if (u.referredBy) {
            const bid = u.referredBy.toString();
            if (!bookieUserMap[bid]) bookieUserMap[bid] = [];
            bookieUserMap[bid].push(u._id);
        }
    }
    return bookieUserMap;
}

export async function getAdminCollectsBookies(bookieIdFilter) {
    const query = { role: 'bookie', bookieType: 'admin_collects' };
    if (bookieIdFilter) query._id = bookieIdFilter;
    return Admin.find(query).select('_id username phone commissionPercentage bookieType').lean();
}

/** Commission for a single bookie on one calendar day (YYYY-MM-DD). */
export async function computeCommissionForBookieDay(bookieId, settlementDate) {
    const bookie = await Admin.findOne({ _id: bookieId, role: 'bookie' }).select('commissionPercentage bookieType').lean();
    if (!bookie) return { revenue: 0, commission: 0, betCount: 0 };
    const users = await User.find({ referredBy: bookieId }).select('_id').lean();
    const userIds = users.map((u) => u._id);
    const rows = await computeBookieDailyCommission(bookie, userIds, settlementDate, settlementDate);
    return rows[0] || { revenue: 0, commission: 0, betCount: 0 };
}
