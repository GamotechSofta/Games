import mongoose from 'mongoose';
import Bet from '../models/bet/bet.js';
import Market from '../models/market/market.js';
import { getRatesMap } from '../models/rate/rate.js';
import { isSinglePatti, isDoublePatti } from './singlePattiUtils.js';
import { getAllChartPannas } from './chartPannaCatalog.js';
import {
    computeDeclaredOpenWinPayout,
    computeClosePreviewFromBets,
    isCloseSettlePoolBet,
} from './settleBets.js';
import { toDateKeyIST, getTomorrowKeyIST } from './marketStatsAggregation.js';

const PROFIT_BANDS = [
    { label: '0–10%', min: 0, max: 10 },
    { label: '11–20%', min: 11, max: 20 },
    { label: '21–30%', min: 21, max: 30 },
    { label: '31–40%', min: 31, max: 40 },
    { label: '41–50%', min: 41, max: 50 },
    { label: '51–60%', min: 51, max: 60 },
    { label: '61–70%', min: 61, max: 70 },
    { label: '71–80%', min: 71, max: 80 },
    { label: '81–90%', min: 81, max: 90 },
    { label: '91–100%', min: 91, max: 100 },
];

function toObjectId(id) {
    if (!id) return null;
    if (id instanceof mongoose.Types.ObjectId) return id;
    try {
        const str = String(id).trim();
        return mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str
            ? new mongoose.Types.ObjectId(str)
            : null;
    } catch {
        return null;
    }
}

function digitFromPatti(threeDigitStr) {
    const s = String(threeDigitStr || '').trim();
    if (!/^\d{3}$/.test(s)) return null;
    const sum = Number(s[0]) + Number(s[1]) + Number(s[2]);
    return String(sum % 10);
}

function isTriplePatti(patti) {
    const s = String(patti ?? '').trim();
    if (!/^\d{3}$/.test(s)) return false;
    return s[0] === s[1] && s[1] === s[2];
}

function isChartPanna(p3) {
    return isSinglePatti(p3) || isDoublePatti(p3) || isTriplePatti(p3);
}

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

function parseHHMMForSession(t) {
    const s = String(t || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
}

function minutesISTForSession(dt) {
    try {
        const hhmm = new Date(dt).toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const [hh, mm] = String(hhmm).split(':');
        const h = Number(hh);
        const m = Number(mm);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
    } catch {
        return null;
    }
}

function resolveBetSession(bet, startMin) {
    const betType = (bet?.betType || '').toString().trim().toLowerCase();
    let session =
        (betType === 'jodi' || betType === 'full-sangam' || betType === 'half-sangam')
            ? 'close'
            : ((bet?.betOn === 'close') ? 'close' : (bet?.betOn === 'open' ? 'open' : null));
    if (!session && startMin != null && bet?.createdAt) {
        const betMin = minutesISTForSession(bet.createdAt);
        if (betMin != null) session = betMin < startMin ? 'open' : 'close';
    }
    if (!session) session = 'open';
    return session;
}

function getBetDateBucket(bet, todayKey, tomorrowKey) {
    if (bet?.scheduledDate) {
        const schedKey = toDateKeyIST(new Date(bet.scheduledDate));
        if (schedKey === tomorrowKey) return 'tomorrow';
        if (schedKey === todayKey) return 'today';
        return 'exclude';
    }
    const createdKey = toDateKeyIST(new Date(bet.createdAt));
    if (!bet?.isScheduled && createdKey === todayKey) return 'today';
    return 'exclude';
}

function getTodayISTRange() {
    const todayKey = toDateKeyIST(new Date());
    return {
        todayKey,
        start: new Date(`${todayKey}T00:00:00+05:30`),
        end: new Date(`${todayKey}T23:59:59.999+05:30`),
    };
}

function buildDateBucketFilter(dateBucket) {
    const { todayKey, start, end } = getTodayISTRange();
    const tomorrowKey = getTomorrowKeyIST(todayKey);
    const startTomorrow = new Date(`${tomorrowKey}T00:00:00+05:30`);
    const endTomorrow = new Date(`${tomorrowKey}T23:59:59.999+05:30`);

    if (dateBucket === 'tomorrow') {
        return { scheduledDate: { $gte: startTomorrow, $lte: endTomorrow } };
    }

    return {
        $or: [
            {
                createdAt: { $gte: start, $lte: end },
                $or: [
                    { isScheduled: { $ne: true } },
                    { scheduledDate: { $exists: false } },
                    { scheduledDate: null },
                ],
            },
            { scheduledDate: { $gte: start, $lte: end } },
        ],
    };
}

const PATTI_BET_TYPES = new Set([
    'panna',
    'sp-common',
    'dp-common',
    'cp-common',
    'chart-game',
    'sp-motor',
    'dp-motor',
    'sp-dp-motor',
    'sp-dp-motor-dp',
    'sp-dp-motor-tp',
]);

function normalizeChartPanna3(val) {
    const raw = String(val ?? '').trim();
    if (/^\d{3}$/.test(raw)) return raw.padStart(3, '0');
    const m = raw.match(/(\d{3})$/);
    if (!m) return null;
    const p3 = m[1].padStart(3, '0');
    return isChartPanna(p3) ? p3 : null;
}

function extractChartPannaFromBet(bet) {
    const type = (bet.betType || '').toLowerCase();
    if (!PATTI_BET_TYPES.has(type)) return null;
    if (type === 'panna') {
        return normalizePlayedPatti3(bet.betNumber);
    }
    const p3 = normalizeChartPanna3(bet.betNumber);
    if (!p3) return null;
    if (type === 'sp-common' && !isSinglePatti(p3)) return null;
    if (type === 'dp-common' && !isDoublePatti(p3)) return null;
    return p3;
}

function computeOpenWinPayoutForPanna(bets, panna, rates) {
    const open3 = panna.padStart(3, '0');
    const lastDigitOpen = digitFromPatti(open3);
    let totalWinAmountOnPatti = 0;
    for (const bet of bets) {
        if ((bet.betOn || '').toString().toLowerCase() === 'close') continue;
        if ((bet.status || '').toString().toLowerCase() !== 'pending') continue;
        totalWinAmountOnPatti += computeDeclaredOpenWinPayout(bet, open3, lastDigitOpen, rates);
    }
    return round2(totalWinAmountOnPatti);
}

function profitPercent(profit, stakeBase) {
    if (!stakeBase || stakeBase <= 0) {
        if (profit < 0) return -100;
        if (profit > 0) return 100;
        return 0;
    }
    return round2((profit / stakeBase) * 100);
}

function isHouseLoss(profit) {
    return Number(profit) < 0;
}

function assignBand(profit, profitPct) {
    if (isHouseLoss(profit)) return 'loss';
    const pct = round2(profitPct);
    if (pct > 100) return '91–100%';
    if (pct <= 10) return '0–10%';
    if (pct <= 20) return '11–20%';
    if (pct <= 30) return '21–30%';
    if (pct <= 40) return '31–40%';
    if (pct <= 50) return '41–50%';
    if (pct <= 60) return '51–60%';
    if (pct <= 70) return '61–70%';
    if (pct <= 80) return '71–80%';
    if (pct <= 90) return '81–90%';
    return '91–100%';
}

function matchesTarget(profitPct, target, tolerance) {
    const pct = round2(profitPct);
    const tgt = round2(target);
    const tol = Math.max(0, Number(tolerance) || 0);
    if (tol === 0) return pct === tgt;
    return pct >= tgt - tol && pct <= tgt + tol;
}

function formatPattiDisplay(patti, profitPct) {
    return `${patti} (${profitPct.toFixed(2)}%)`;
}

function normalizePlayedPatti3(val) {
    const raw = String(val ?? '').trim();
    if (/^\d{1,3}$/.test(raw)) return raw.padStart(3, '0');
    const m = raw.match(/(\d{3})$/);
    return m ? m[1].padStart(3, '0') : null;
}

function collectPlayedPannas(scopedBets, extraPattis = []) {
    const playedPannas = new Set();
    for (const bet of scopedBets) {
        const p3 = extractChartPannaFromBet(bet);
        if (p3) playedPannas.add(p3);
    }
    for (const raw of extraPattis) {
        const p3 = normalizePlayedPatti3(raw);
        if (p3) playedPannas.add(p3);
    }
    return playedPannas;
}

function computePannaResults(candidates, {
    session,
    stakeTotal,
    openDeclareBets,
    dateFilteredBets,
    open3Declared,
    rates,
}) {
    const pannaResults = [];
    for (const panna of candidates) {
        let profit;
        let profitPct;

        if (session === 'open') {
            const winPayout = computeOpenWinPayoutForPanna(openDeclareBets, panna, rates);
            profit = round2(stakeTotal - winPayout);
            profitPct = profitPercent(profit, stakeTotal);
        } else {
            const close3 = panna.padStart(3, '0');
            const preview = computeClosePreviewFromBets(dateFilteredBets, {
                open3: open3Declared,
                close3,
                lastDigitOpen: digitFromPatti(open3Declared),
                lastDigitClose: digitFromPatti(close3),
                rates,
            });
            profit = preview.profit;
            profitPct = profitPercent(profit, preview.totalBetAmount);
        }

        pannaResults.push({ patti: panna, profit, profitPercent: profitPct });
    }
    pannaResults.sort((a, b) => b.profitPercent - a.profitPercent);
    return pannaResults;
}

function buildBandsFromResults(pannaResults) {
    const lossPattis = pannaResults.filter((r) => isHouseLoss(r.profit));
    const loss = {
        count: lossPattis.length,
        minPercent: lossPattis.length ? Math.min(...lossPattis.map((r) => r.profitPercent)) : null,
        maxPercent: lossPattis.length ? Math.max(...lossPattis.map((r) => r.profitPercent)) : null,
        pattis: lossPattis.map((r) => ({
            patti: r.patti,
            profitPercent: r.profitPercent,
            display: formatPattiDisplay(r.patti, r.profitPercent),
        })),
    };

    const bandMap = {};
    for (const b of PROFIT_BANDS) bandMap[b.label] = [];
    for (const r of pannaResults) {
        if (isHouseLoss(r.profit)) continue;
        const bandLabel = assignBand(r.profit, r.profitPercent);
        if (bandLabel && bandMap[bandLabel]) {
            bandMap[bandLabel].push({
                patti: r.patti,
                profitPercent: r.profitPercent,
                display: formatPattiDisplay(r.patti, r.profitPercent),
            });
        }
    }

    const bands = PROFIT_BANDS.map((b) => ({
        band: b.label,
        pattis: bandMap[b.label] || [],
    }));

    return {
        loss,
        bands,
        allPattis: pannaResults.map((r) => ({
            patti: r.patti,
            profit: r.profit,
            profitPercent: r.profitPercent,
            display: formatPattiDisplay(r.patti, r.profitPercent),
        })),
    };
}

function buildMatchesFromResults(pannaResults, targetProfit, tolerance) {
    if (!Number.isFinite(targetProfit)) return [];
    return pannaResults
        .filter((r) => matchesTarget(r.profitPercent, targetProfit, tolerance))
        .sort((a, b) => {
            const da = Math.abs(round2(a.profitPercent) - round2(targetProfit));
            const db = Math.abs(round2(b.profitPercent) - round2(targetProfit));
            return da - db || b.profitPercent - a.profitPercent;
        })
        .map((r) => ({
            patti: r.patti,
            profitPercent: r.profitPercent,
            display: formatPattiDisplay(r.patti, r.profitPercent),
        }));
}

/**
 * House profit scan for Market Detail.
 * - Target finder: played chart pannas matching target ± tolerance
 * - Bucket table: all chart pannas (SP + double + triple) with profit/loss %
 */
export async function scanPlayedPannasHouseProfit(marketId, options = {}) {
    const oid = toObjectId(marketId);
    const session = options.session === 'close' ? 'close' : 'open';
    const dateBucket = options.dateBucket === 'tomorrow' ? 'tomorrow' : 'today';
    const targetProfit = Number(options.targetProfit);
    const tolerance = Number(options.tolerance) || 0;
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;

    const emptyResult = {
        session,
        dateBucket,
        stakeTotal: 0,
        loss: { count: 0, minPercent: null, maxPercent: null, pattis: [] },
        bands: PROFIT_BANDS.map((b) => ({ band: b.label, pattis: [] })),
        matches: [],
        playedCount: 0,
        chartPannaCount: getAllChartPannas().length,
        totalCalculated: getAllChartPannas().length,
        allPattis: [],
        viewLabel: session === 'open' ? 'Open bets only' : 'Closed bets only',
    };

    if (!oid) return emptyResult;

    const market = await Market.findById(oid).select('startingTime openingNumber').lean();
    if (!market) return emptyResult;

    const todayKey = toDateKeyIST(new Date());
    const tomorrowKey = getTomorrowKeyIST(todayKey);
    const startMin = parseHHMMForSession(market.startingTime);
    const marketIdStr = String(marketId).trim();

    const match = {
        status: { $ne: 'cancelled' },
        $and: [
            { $or: [{ marketId: oid }, { marketId: marketIdStr }] },
            buildDateBucketFilter(dateBucket),
        ],
    };
    if (hasBookieFilter) match.userId = { $in: bookieUserIds };

    const allBets = await Bet.find(match).lean();
    const dateFilteredBets = allBets.filter(
        (b) => getBetDateBucket(b, todayKey, tomorrowKey) === dateBucket,
    );
    const scopedBets = dateFilteredBets.filter(
        (b) => resolveBetSession(b, startMin) === session,
    );

    const rates = await getRatesMap();
    const playedPannas = collectPlayedPannas(scopedBets, options.playedPattis || []);
    const chartPannas = getAllChartPannas();

    const open3Declared = (market.openingNumber || '').toString();
    let stakeTotal = 0;

    if (session === 'open') {
        stakeTotal = round2(
            dateFilteredBets
                .filter((b) => resolveBetSession(b, startMin) === 'open')
                .reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
        );
    } else {
        if (!/^\d{3}$/.test(open3Declared)) {
            return { ...emptyResult, error: 'Open result must be declared before scanning close-session profit.' };
        }
        stakeTotal = round2(
            dateFilteredBets
                .filter((b) => isCloseSettlePoolBet(b))
                .reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
        );
    }

    const openDeclareBets = dateFilteredBets.filter(
        (b) => (b.betOn || '').toString().toLowerCase() !== 'close',
    );

    const scanCtx = {
        session,
        stakeTotal,
        openDeclareBets,
        dateFilteredBets,
        open3Declared,
        rates,
    };

    const playedResults = computePannaResults([...playedPannas], scanCtx);
    const chartResults = computePannaResults(chartPannas, scanCtx);
    const { loss, bands, allPattis } = buildBandsFromResults(chartResults);
    const matches = buildMatchesFromResults(playedResults, targetProfit, tolerance);

    return {
        session,
        dateBucket,
        stakeTotal,
        playedCount: playedResults.length,
        chartPannaCount: chartResults.length,
        totalCalculated: chartResults.length,
        allPattis,
        loss,
        bands,
        matches,
        viewLabel: session === 'open' ? 'Open bets only' : 'Closed bets only',
    };
}
