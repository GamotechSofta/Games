import User from '../models/user/user.js';
import Bet from '../models/bet/bet.js';
import { appCacheGet, appCacheSet, appCacheDel } from './appCache.js';

const CACHE_KEY = 'bookie-user-map';
const CACHE_TTL_MS = Number(process.env.BOOKIE_USER_MAP_CACHE_TTL_MS || 5 * 60 * 1000);

/**
 * Cached map of bookieId → [userId, ...] and direct (no bookie) user ids.
 */
export async function getBookieUserMap() {
    const cached = await appCacheGet(CACHE_KEY);
    if (cached?.bookieUserMap) {
        return {
            bookieUserMap: cached.bookieUserMap,
            directUserIds: cached.directUserIds || [],
        };
    }

    const rows = await User.aggregate([
        { $project: { referredBy: 1 } },
        {
            $group: {
                _id: '$referredBy',
                userIds: { $push: '$_id' },
            },
        },
    ]);

    const bookieUserMap = {};
    const directUserIds = [];

    for (const row of rows) {
        const ids = (row.userIds || []).map((id) => String(id));
        if (row._id) {
            bookieUserMap[String(row._id)] = ids;
        } else {
            directUserIds.push(...ids);
        }
    }

    const payload = { bookieUserMap, directUserIds };
    await appCacheSet(CACHE_KEY, payload, CACHE_TTL_MS);

    return payload;
}

export async function invalidateBookieUserMapCache() {
    await appCacheDel(CACHE_KEY);
}

/**
 * Single aggregation: daily bet totals grouped by user's bookie (referredBy) and date.
 * Returns Map<bookieIdStr, Map<dateStr, { totalBetAmount, count }>>
 */
export async function aggregateDailyBetsByBookie(dateFilter) {
    const match = { status: { $ne: 'cancelled' }, ...dateFilter };

    const rows = await Bet.aggregate([
        { $match: match },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
                pipeline: [{ $project: { referredBy: 1 } }],
            },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: {
                    bookieId: '$user.referredBy',
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                },
                totalBetAmount: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);

    const byBookie = new Map();
    for (const row of rows) {
        const bookieKey = row._id?.bookieId ? String(row._id.bookieId) : '__direct__';
        const dateKey = row._id?.date;
        if (!dateKey) continue;
        if (!byBookie.has(bookieKey)) byBookie.set(bookieKey, new Map());
        byBookie.get(bookieKey).set(dateKey, {
            totalBetAmount: row.totalBetAmount || 0,
            count: row.count || 0,
        });
    }
    return byBookie;
}
