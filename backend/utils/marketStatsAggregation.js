import mongoose from 'mongoose';
import { buildSinglePattiFirstDigitSummary } from './singlePattiUtils.js';
import {
    betMatchesDeclaredOpenPatti,
    betMatchesDeclaredOpenAnk,
    computeDeclaredOpenWinPayout,
    betMatchesDeclaredClosePatti,
    betMatchesDeclaredCloseAnk,
    computeDeclaredCloseWinPayout,
} from './settleBets.js';

const IST = 'Asia/Kolkata';

/** @returns {ReturnType<typeof makeEmptyMarketStats>} */
export function makeEmptyMarketStats() {
    return {
        singleDigit: { digits: {}, totalAmount: 0, totalBets: 0 },
        jodi: { items: {}, totalAmount: 0, totalBets: 0 },
        singlePatti: { items: {}, totalAmount: 0, totalBets: 0 },
        doublePatti: { items: {}, totalAmount: 0, totalBets: 0 },
        triplePatti: { items: {}, totalAmount: 0, totalBets: 0 },
        halfSangam: { items: {}, totalAmount: 0, totalBets: 0 },
        fullSangam: { items: {}, totalAmount: 0, totalBets: 0 },
    };
}

export function toDateKeyIST(d = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

export function getTomorrowKeyIST(todayKey) {
    const [y, m, d] = todayKey.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    return toDateKeyIST(next);
}

function parseHHMMToMinutes(timeStr) {
    const s = String(timeStr || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
}

function digitFromPatti(threeDigitStr) {
    const s = String(threeDigitStr || '').trim();
    if (!/^\d{3}$/.test(s)) return null;
    return String([...s].reduce((acc, c) => acc + Number(c), 0) % 10);
}

/**
 * Indexed-friendly $match (marketId + createdAt / scheduledDate windows).
 */
export function buildMarketStatsMatch({
    marketId,
    bookieUserIds,
    startOfTodayIST,
    endOfTodayIST,
    startOfTomorrowIST,
    endOfTomorrowIST,
}) {
    const oid = mongoose.Types.ObjectId.isValid(String(marketId))
        ? new mongoose.Types.ObjectId(String(marketId))
        : marketId;

    const match = {
        marketId: oid,
        status: { $ne: 'cancelled' },
        $or: [
            {
                createdAt: { $gte: startOfTodayIST, $lte: endOfTodayIST },
                $or: [{ scheduledDate: null }, { scheduledDate: { $exists: false } }],
            },
            { scheduledDate: { $gte: startOfTodayIST, $lte: endOfTodayIST } },
            { scheduledDate: { $gte: startOfTomorrowIST, $lte: endOfTomorrowIST } },
        ],
    };

    if (bookieUserIds !== null && bookieUserIds.length > 0) {
        match.userId = { $in: bookieUserIds };
    }

    return match;
}

/**
 * Stages: classify bets → filter today/tomorrow → (facet groups downstream).
 * @param {number|null} startMin minutes from midnight for session backfill
 * @param {string} todayKey YYYY-MM-DD IST
 * @param {string} tomorrowKey YYYY-MM-DD IST
 */
export function buildClassificationStages(startMin, todayKey, tomorrowKey) {
    const startMinConst = startMin != null ? startMin : -1;

    return [
        {
            $addFields: {
                type: { $toLower: { $ifNull: ['$betType', ''] } },
                num: {
                    $trim: {
                        input: { $toString: { $ifNull: ['$betNumber', ''] } },
                    },
                },
                amt: { $toDouble: { $ifNull: ['$amount', 0] } },
                schedKey: {
                    $cond: [
                        { $ifNull: ['$scheduledDate', false] },
                        {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$scheduledDate',
                                timezone: IST,
                            },
                        },
                        null,
                    ],
                },
                createdKey: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt',
                        timezone: IST,
                    },
                },
                betMin: {
                    $add: [
                        {
                            $multiply: [
                                {
                                    $hour: {
                                        date: '$createdAt',
                                        timezone: IST,
                                    },
                                },
                                60,
                            ],
                        },
                        {
                            $minute: {
                                date: '$createdAt',
                                timezone: IST,
                            },
                        },
                    ],
                },
            },
        },
        {
            $addFields: {
                dateBucket: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $and: [
                                        { $ne: ['$schedKey', null] },
                                        { $eq: ['$schedKey', tomorrowKey] },
                                    ],
                                },
                                then: 'tomorrow',
                            },
                            {
                                case: {
                                    $or: [
                                        {
                                            $and: [
                                                { $ne: ['$schedKey', null] },
                                                { $eq: ['$schedKey', todayKey] },
                                            ],
                                        },
                                        {
                                            $and: [
                                                { $eq: ['$schedKey', null] },
                                                { $ne: ['$isScheduled', true] },
                                                { $eq: ['$createdKey', todayKey] },
                                            ],
                                        },
                                    ],
                                },
                                then: 'today',
                            },
                        ],
                        default: 'exclude',
                    },
                },
                session: {
                    $let: {
                        vars: {
                            forcedClose: {
                                $in: [
                                    '$type',
                                    ['jodi', 'full-sangam', 'half-sangam'],
                                ],
                            },
                        },
                        in: {
                            $cond: [
                                '$$forcedClose',
                                'close',
                                {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { $eq: ['$betOn', 'close'] },
                                                then: 'close',
                                            },
                                            {
                                                case: { $eq: ['$betOn', 'open'] },
                                                then: 'open',
                                            },
                                        ],
                                        default: {
                                            $cond: [
                                                {
                                                    $and: [
                                                        { $ne: [startMinConst, -1] },
                                                        { $lt: ['$betMin', startMinConst] },
                                                    ],
                                                },
                                                'open',
                                                'close',
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
                d0: { $substrCP: ['$num', 0, 1] },
                d1: { $substrCP: ['$num', 1, 1] },
                d2: { $substrCP: ['$num', 2, 1] },
                is3: {
                    $regexMatch: { input: '$num', regex: /^[0-9]{3}$/ },
                },
                is2: {
                    $regexMatch: { input: '$num', regex: /^[0-9]{2}$/ },
                },
                is1: {
                    $regexMatch: { input: '$num', regex: /^[0-9]$/ },
                },
                chartPanna: {
                    $let: {
                        vars: {
                            m: {
                                $regexFind: {
                                    input: '$num',
                                    regex: /([0-9]{3})$/,
                                },
                            },
                        },
                        in: {
                            $cond: [
                                { $ifNull: ['$$m.match', false] },
                                { $arrayElemAt: ['$$m.captures', 0] },
                                null,
                            ],
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                allSame: {
                    $and: [
                        '$is3',
                        { $eq: ['$d0', '$d1'] },
                        { $eq: ['$d1', '$d2'] },
                    ],
                },
                twoSame: {
                    $and: [
                        '$is3',
                        {
                            $or: [
                                { $eq: ['$d0', '$d1'] },
                                { $eq: ['$d1', '$d2'] },
                                { $eq: ['$d0', '$d2'] },
                            ],
                        },
                    ],
                },
                allUnique: {
                    $and: [
                        '$is3',
                        { $ne: ['$d0', '$d1'] },
                        { $ne: ['$d1', '$d2'] },
                        { $ne: ['$d0', '$d2'] },
                    ],
                },
                panna3: {
                    $cond: ['$is3', '$num', '$chartPanna'],
                },
            },
        },
        {
            $addFields: {
                category: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'odd-even'] },
                                        '$is1',
                                    ],
                                },
                                then: 'singleDigit',
                            },
                            {
                                case: { $eq: ['$type', 'chart-game'] },
                                then: {
                                    $cond: [
                                        { $ne: ['$panna3', null] },
                                        'pannaDerived',
                                        null,
                                    ],
                                },
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'sp-common'] },
                                        '$is3',
                                        '$allUnique',
                                    ],
                                },
                                then: 'singlePatti',
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'dp-common'] },
                                        '$is3',
                                        '$twoSame',
                                        { $not: '$allSame' },
                                    ],
                                },
                                then: 'doublePatti',
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'cp-common'] },
                                        '$is3',
                                    ],
                                },
                                then: 'pannaDerived',
                            },
                            {
                                case: {
                                    $and: [
                                        {
                                            $in: [
                                                '$type',
                                                [
                                                    'sp-motor',
                                                    'dp-motor',
                                                    'sp-dp-motor',
                                                    'sp-dp-motor-dp',
                                                    'sp-dp-motor-tp',
                                                ],
                                            ],
                                        },
                                        '$is3',
                                    ],
                                },
                                then: 'pannaDerived',
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'single'] },
                                        '$is1',
                                    ],
                                },
                                then: 'singleDigit',
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'jodi'] },
                                        '$is2',
                                    ],
                                },
                                then: 'jodi',
                            },
                            {
                                case: {
                                    $and: [
                                        { $eq: ['$type', 'panna'] },
                                        '$is3',
                                    ],
                                },
                                then: 'pannaDerived',
                            },
                            { case: { $eq: ['$type', 'half-sangam'] }, then: 'halfSangam' },
                            { case: { $eq: ['$type', 'full-sangam'] }, then: 'fullSangam' },
                        ],
                        default: null,
                    },
                },
            },
        },
        {
            $addFields: {
                category: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq: ['$category', 'pannaDerived'] },
                                then: {
                                    $cond: [
                                        '$allSame',
                                        'triplePatti',
                                        {
                                            $cond: [
                                                {
                                                    $and: [
                                                        '$twoSame',
                                                        { $not: '$allSame' },
                                                    ],
                                                },
                                                'doublePatti',
                                                {
                                                    $cond: [
                                                        '$allUnique',
                                                        'singlePatti',
                                                        null,
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        ],
                        default: '$category',
                    },
                },
                itemKey: {
                    $switch: {
                        branches: [
                            {
                                case: {
                                    $in: [
                                        '$category',
                                        [
                                            'singleDigit',
                                            'jodi',
                                            'singlePatti',
                                            'doublePatti',
                                            'triplePatti',
                                        ],
                                    ],
                                },
                                then: {
                                    $cond: [
                                        { $eq: ['$category', 'singleDigit'] },
                                        '$num',
                                        {
                                            $cond: [
                                                {
                                                    $in: [
                                                        '$category',
                                                        [
                                                            'singlePatti',
                                                            'doublePatti',
                                                            'triplePatti',
                                                        ],
                                                    ],
                                                },
                                                '$panna3',
                                                '$num',
                                            ],
                                        },
                                    ],
                                },
                            },
                            {
                                case: { $eq: ['$category', 'halfSangam'] },
                                then: {
                                    $let: {
                                        vars: {
                                            parts: { $split: ['$num', '-'] },
                                        },
                                        in: {
                                            $cond: [
                                                { $eq: [{ $size: '$$parts' }, 2] },
                                                {
                                                    $let: {
                                                        vars: {
                                                            a: {
                                                                $trim: {
                                                                    input: {
                                                                        $arrayElemAt: [
                                                                            '$$parts',
                                                                            0,
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                            b: {
                                                                $trim: {
                                                                    input: {
                                                                        $arrayElemAt: [
                                                                            '$$parts',
                                                                            1,
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                        },
                                                        in: {
                                                            $cond: [
                                                                {
                                                                    $and: [
                                                                        {
                                                                            $regexMatch: {
                                                                                input: '$$a',
                                                                                regex: /^[0-9]{3}$/,
                                                                            },
                                                                        },
                                                                        {
                                                                            $regexMatch: {
                                                                                input: '$$b',
                                                                                regex: /^[0-9]$/,
                                                                            },
                                                                        },
                                                                    ],
                                                                },
                                                                { $concat: ['$$a', '-', '$$b'] },
                                                                {
                                                                    $cond: [
                                                                        {
                                                                            $and: [
                                                                                {
                                                                                    $regexMatch: {
                                                                                        input: '$$a',
                                                                                        regex: /^[0-9]$/,
                                                                                    },
                                                                                },
                                                                                {
                                                                                    $regexMatch: {
                                                                                        input: '$$b',
                                                                                        regex: /^[0-9]{3}$/,
                                                                                    },
                                                                                },
                                                                            ],
                                                                        },
                                                                        { $concat: ['$$a', '-', '$$b'] },
                                                                        null,
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    },
                                                },
                                                null,
                                            ],
                                        },
                                    },
                                },
                            },
                            {
                                case: { $eq: ['$category', 'fullSangam'] },
                                then: {
                                    $let: {
                                        vars: {
                                            parts: { $split: ['$num', '-'] },
                                        },
                                        in: {
                                            $cond: [
                                                { $eq: [{ $size: '$$parts' }, 2] },
                                                {
                                                    $let: {
                                                        vars: {
                                                            a: {
                                                                $trim: {
                                                                    input: {
                                                                        $arrayElemAt: [
                                                                            '$$parts',
                                                                            0,
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                            b: {
                                                                $trim: {
                                                                    input: {
                                                                        $arrayElemAt: [
                                                                            '$$parts',
                                                                            1,
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                        },
                                                        in: {
                                                            $cond: [
                                                                {
                                                                    $and: [
                                                                        {
                                                                            $regexMatch: {
                                                                                input: '$$a',
                                                                                regex: /^[0-9]{3}$/,
                                                                            },
                                                                        },
                                                                        {
                                                                            $regexMatch: {
                                                                                input: '$$b',
                                                                                regex: /^[0-9]{3}$/,
                                                                            },
                                                                        },
                                                                    ],
                                                                },
                                                                { $concat: ['$$a', '-', '$$b'] },
                                                                null,
                                                            ],
                                                        },
                                                    },
                                                },
                                                null,
                                            ],
                                        },
                                    },
                                },
                            },
                        ],
                        default: null,
                    },
                },
            },
        },
        {
            $match: {
                dateBucket: { $in: ['today', 'tomorrow'] },
                category: { $ne: null },
                itemKey: { $ne: null },
            },
        },
    ];
}

function foldGroupedRows(rows, dateBucket, sessionMode) {
    const stats = makeEmptyMarketStats();

    for (const row of rows || []) {
        const id = row._id || {};
        if (id.dateBucket !== dateBucket) continue;

        const category = id.category;
        const key = id.itemKey;
        if (!category || key == null) continue;

        let amount = row.totalAmount || 0;
        let count = row.totalCount || 0;
        if (sessionMode === 'open') {
            amount = row.openAmount || 0;
            count = row.openCount || 0;
        } else if (sessionMode === 'close') {
            amount = row.closeAmount || 0;
            count = row.closeCount || 0;
        }

        if (count <= 0) continue;

        if (category === 'singleDigit') {
            if (!stats.singleDigit.digits[key]) {
                stats.singleDigit.digits[key] = { amount: 0, count: 0 };
            }
            stats.singleDigit.digits[key].amount += amount;
            stats.singleDigit.digits[key].count += count;
            stats.singleDigit.totalAmount += amount;
            stats.singleDigit.totalBets += count;
        } else if (
            category === 'jodi' ||
            category === 'singlePatti' ||
            category === 'doublePatti' ||
            category === 'triplePatti' ||
            category === 'halfSangam' ||
            category === 'fullSangam'
        ) {
            const bucket = stats[category];
            if (!bucket.items[key]) bucket.items[key] = { amount: 0, count: 0 };
            bucket.items[key].amount += amount;
            bucket.items[key].count += count;
            bucket.totalAmount += amount;
            bucket.totalBets += count;
        }
    }

    return stats;
}

/**
 * Legacy resultOnPatti + singlePattiSummary from today's lean bets (one JS pass each).
 */
function buildResultOnPattiAndSummary(todayBets, market, rates, includeSinglePatti) {
    const resultOnPatti = { open: null, close: null };

    const open3Raw = (market.openingNumber || '').toString().replace(/\D/g, '').slice(0, 3);
    const close3Raw = (market.closingNumber || '').toString().replace(/\D/g, '').slice(0, 3);
    const open3 = open3Raw.length === 3 ? open3Raw.padStart(3, '0') : null;
    const close3 = close3Raw.length === 3 ? close3Raw.padStart(3, '0') : null;
    const lastDigitOpen = open3 ? digitFromPatti(open3) : null;
    const lastDigitClose = close3 ? digitFromPatti(close3) : null;

    if (open3 && lastDigitOpen) {
        let totalBetAmountOnOpenPatti = 0;
        let totalWinAmountOnOpenPatti = 0;
        const playersOnOpenPatti = new Set();

        for (const b of todayBets) {
            if (b.session !== 'open') continue;
            const amount = Number(b.amount) || 0;
            const matchesPatti = betMatchesDeclaredOpenPatti(b, open3);
            const matchesAnk = betMatchesDeclaredOpenAnk(b, lastDigitOpen);
            if (matchesPatti || matchesAnk) {
                totalBetAmountOnOpenPatti += amount;
                playersOnOpenPatti.add(String(b.userId));
                if ((b.status || '').toString().toLowerCase() === 'pending') {
                    totalWinAmountOnOpenPatti += computeDeclaredOpenWinPayout(
                        b,
                        open3,
                        lastDigitOpen,
                        rates,
                    );
                }
            }
        }

        totalWinAmountOnOpenPatti = Math.round(totalWinAmountOnOpenPatti * 100) / 100;
        resultOnPatti.open = {
            totalBetAmountOnPatti: Math.round(totalBetAmountOnOpenPatti * 100) / 100,
            totalWinAmountOnPatti: totalWinAmountOnOpenPatti,
            totalBetsOnPatti: 0,
            totalPlayersBetOnPatti: playersOnOpenPatti.size,
        };
    }

    if (close3 && lastDigitClose) {
        let totalBetAmountOnClosePatti = 0;
        let totalWinAmountOnClosePatti = 0;
        const playersOnClosePatti = new Set();

        for (const b of todayBets) {
            if (b.session !== 'close') continue;
            const amount = Number(b.amount) || 0;
            const matchesPatti = betMatchesDeclaredClosePatti(b, close3);
            const matchesAnk = betMatchesDeclaredCloseAnk(b, lastDigitClose);
            if (matchesPatti || matchesAnk) {
                totalBetAmountOnClosePatti += amount;
                playersOnClosePatti.add(String(b.userId));
                if ((b.status || '').toString().toLowerCase() === 'pending') {
                    totalWinAmountOnClosePatti += computeDeclaredCloseWinPayout(
                        b,
                        open3,
                        close3,
                        lastDigitOpen,
                        lastDigitClose,
                        rates,
                    );
                }
            }
        }

        totalWinAmountOnClosePatti = Math.round(totalWinAmountOnClosePatti * 100) / 100;
        resultOnPatti.close = {
            totalBetAmountOnPatti: Math.round(totalBetAmountOnClosePatti * 100) / 100,
            totalWinAmountOnPatti: totalWinAmountOnClosePatti,
            totalBetsOnPatti: 0,
            totalPlayersBetOnPatti: playersOnClosePatti.size,
        };
    }

    const singlePattiSummary = includeSinglePatti
        ? buildSinglePattiFirstDigitSummary(todayBets)
        : null;

    return { resultOnPatti, singlePattiSummary };
}

const GROUP_STAGE = {
    $group: {
        _id: {
            dateBucket: '$dateBucket',
            category: '$category',
            itemKey: '$itemKey',
        },
        totalAmount: { $sum: '$amt' },
        totalCount: { $sum: 1 },
        openAmount: {
            $sum: { $cond: [{ $eq: ['$session', 'open'] }, '$amt', 0] },
        },
        openCount: {
            $sum: { $cond: [{ $eq: ['$session', 'open'] }, 1, 0] },
        },
        closeAmount: {
            $sum: { $cond: [{ $eq: ['$session', 'close'] }, '$amt', 0] },
        },
        closeCount: {
            $sum: { $cond: [{ $eq: ['$session', 'close'] }, 1, 0] },
        },
    },
};

/**
 * @param {import('mongoose').Model} Bet
 */
export async function aggregateMarketStats({
    Bet,
    marketId,
    market,
    bookieUserIds,
    todayKey,
    tomorrowKey,
    startOfTodayIST,
    endOfTodayIST,
    startOfTomorrowIST,
    endOfTomorrowIST,
    includeSinglePatti,
    rates,
}) {
    const startMin = parseHHMMToMinutes(market.startingTime);
    const baseMatch = buildMarketStatsMatch({
        marketId,
        bookieUserIds,
        startOfTodayIST,
        endOfTodayIST,
        startOfTomorrowIST,
        endOfTomorrowIST,
    });

    const pipeline = [
        { $match: baseMatch },
        ...buildClassificationStages(startMin, todayKey, tomorrowKey),
        {
            $facet: {
                statGroups: [GROUP_STAGE],
                todayBetsLean: [
                    { $match: { dateBucket: 'today' } },
                    {
                        $project: {
                            betType: 1,
                            betNumber: 1,
                            amount: '$amt',
                            betOn: 1,
                            status: 1,
                            userId: 1,
                            session: 1,
                        },
                    },
                ],
            },
        },
    ];

    const [facetResult] = await Bet.aggregate(pipeline).allowDiskUse(true);
    const statGroups = facetResult?.statGroups || [];
    const todayBetsLean = facetResult?.todayBetsLean || [];

    const allStats = foldGroupedRows(statGroups, 'today', 'all');
    const openStats = foldGroupedRows(statGroups, 'today', 'open');
    const closeStats = foldGroupedRows(statGroups, 'today', 'close');

    const tomorrowSessionStats = {
        all: foldGroupedRows(statGroups, 'tomorrow', 'all'),
        open: foldGroupedRows(statGroups, 'tomorrow', 'open'),
        close: foldGroupedRows(statGroups, 'tomorrow', 'close'),
    };

    const { resultOnPatti, singlePattiSummary } = buildResultOnPattiAndSummary(
        todayBetsLean,
        market,
        rates,
        includeSinglePatti,
    );

    return {
        allStats,
        openStats,
        closeStats,
        tomorrowSessionStats,
        resultOnPatti,
        singlePattiSummary,
    };
}
