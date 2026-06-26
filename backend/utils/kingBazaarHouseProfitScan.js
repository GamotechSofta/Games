import Market from '../models/market/market.js';
import Bet from '../models/bet/bet.js';
import { getRatesMap } from '../models/rate/rate.js';
import { computeKingBazaarDeclareProfitFromBets } from './settleBets.js';
import {
    buildMarketStatsMatch,
    toDateKeyIST,
    getTomorrowKeyIST,
} from './marketStatsAggregation.js';

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

const ALL_JODIS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));

function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

/** Same today/tomorrow bucket rules as Market Detail stats. */
export function getKingBazaarBetDateBucket(bet, todayKey, tomorrowKey) {
    if (bet?.scheduledDate) {
        const schedKey = toDateKeyIST(new Date(bet.scheduledDate));
        if (schedKey === tomorrowKey) return 'tomorrow';
        if (schedKey === todayKey) return 'today';
        return 'exclude';
    }
    const createdKey = toDateKeyIST(new Date(bet.createdAt));
    if (bet?.isScheduled !== true && createdKey === todayKey) return 'today';
    return 'exclude';
}

/**
 * Pending King Bazaar bets for a date bucket — aligned with get-market-stats scope.
 */
export async function loadKingBazaarPendingBets(marketId, options = {}) {
    const dateBucket = options.dateBucket === 'tomorrow' ? 'tomorrow' : 'today';
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;

    const todayKey = toDateKeyIST(new Date());
    const tomorrowKey = getTomorrowKeyIST(todayKey);
    const startOfTodayIST = new Date(`${todayKey}T00:00:00+05:30`);
    const endOfTodayIST = new Date(`${todayKey}T23:59:59.999+05:30`);
    const startOfTomorrowIST = new Date(`${tomorrowKey}T00:00:00+05:30`);
    const endOfTomorrowIST = new Date(`${tomorrowKey}T23:59:59.999+05:30`);

    const match = buildMarketStatsMatch({
        marketId,
        bookieUserIds: hasBookieFilter ? bookieUserIds : null,
        startOfTodayIST,
        endOfTodayIST,
        startOfTomorrowIST,
        endOfTomorrowIST,
    });
    match.status = 'pending';

    const bets = await Bet.find(match).lean();
    return bets.filter((b) => getKingBazaarBetDateBucket(b, todayKey, tomorrowKey) === dateBucket);
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

function formatOutcomeDisplay(jodi, profitPct) {
    return `${jodi} (${profitPct.toFixed(2)}%)`;
}

function normalizeJodi2(val) {
    const raw = String(val ?? '').trim().replace(/\D/g, '').slice(0, 2);
    return /^\d{2}$/.test(raw) ? raw.padStart(2, '0') : null;
}

function collectPlayedJodis(scopedBets, extraJodis = []) {
    const played = new Set();
    for (const bet of scopedBets) {
        if ((bet.betType || '').toString().toLowerCase() !== 'jodi') continue;
        const j2 = normalizeJodi2(bet.betNumber);
        if (j2) played.add(j2);
    }
    for (const raw of extraJodis) {
        const j2 = normalizeJodi2(raw);
        if (j2) played.add(j2);
    }
    return played;
}

function computeJodiResults(candidates, allBets, rates) {
    const results = [];
    for (const jodi of candidates) {
        const firstDigit = jodi[0];
        const secondDigit = jodi[1];
        const preview = computeKingBazaarDeclareProfitFromBets(allBets, firstDigit, secondDigit, rates);
        const profit = preview.profit;
        const profitPct = profitPercent(profit, preview.totalBetAmountOnPatti);
        results.push({
            patti: jodi,
            profit,
            profitPercent: profitPct,
            totalWinAmount: preview.totalWinAmountOnPatti,
            totalBetAmount: preview.totalBetAmountOnPatti,
            totalMarketPool: preview.totalBetAmount,
        });
    }
    results.sort((a, b) => b.profitPercent - a.profitPercent);
    return results;
}

function buildBandsFromResults(jodiResults) {
    const lossOutcomes = jodiResults.filter((r) => isHouseLoss(r.profit));
    const loss = {
        count: lossOutcomes.length,
        minPercent: lossOutcomes.length ? Math.min(...lossOutcomes.map((r) => r.profitPercent)) : null,
        maxPercent: lossOutcomes.length ? Math.max(...lossOutcomes.map((r) => r.profitPercent)) : null,
        pattis: lossOutcomes.map((r) => ({
            patti: r.patti,
            profit: r.profit,
            profitPercent: r.profitPercent,
            totalBetAmount: r.totalBetAmount,
            totalWinAmount: r.totalWinAmount,
            display: formatOutcomeDisplay(r.patti, r.profitPercent),
        })),
    };

    const bandMap = {};
    for (const b of PROFIT_BANDS) bandMap[b.label] = [];
    for (const r of jodiResults) {
        if (isHouseLoss(r.profit)) continue;
        const bandLabel = assignBand(r.profit, r.profitPercent);
        if (bandLabel && bandMap[bandLabel]) {
            bandMap[bandLabel].push({
                patti: r.patti,
                profit: r.profit,
                profitPercent: r.profitPercent,
                totalBetAmount: r.totalBetAmount,
                totalWinAmount: r.totalWinAmount,
                display: formatOutcomeDisplay(r.patti, r.profitPercent),
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
        allPattis: jodiResults.map((r) => ({
            patti: r.patti,
            profit: r.profit,
            profitPercent: r.profitPercent,
            totalBetAmount: r.totalBetAmount,
            totalWinAmount: r.totalWinAmount,
            display: formatOutcomeDisplay(r.patti, r.profitPercent),
        })),
    };
}

function buildMatchesFromResults(jodiResults, targetProfit, tolerance) {
    if (!Number.isFinite(targetProfit)) return [];
    return jodiResults
        .filter((r) => matchesTarget(r.profitPercent, targetProfit, tolerance))
        .sort((a, b) => {
            const da = Math.abs(round2(a.profitPercent) - round2(targetProfit));
            const db = Math.abs(round2(b.profitPercent) - round2(targetProfit));
            return da - db || b.profitPercent - a.profitPercent;
        })
        .map((r) => ({
            patti: r.patti,
            profitPercent: r.profitPercent,
            display: formatOutcomeDisplay(r.patti, r.profitPercent),
        }));
}

/**
 * King Bazaar house profit scan — all jodi outcomes (00–99).
 * Uses the same bet scope and declare-preview formula as Add Result → Check:
 * stake = 1st digit + 2nd digit + jodi pool; wins at single / jodi rates from Update Rate.
 */
export async function scanKingBazaarHouseProfit(marketId, options = {}) {
    const dateBucket = options.dateBucket === 'tomorrow' ? 'tomorrow' : 'today';
    const targetProfit = Number(options.targetProfit);
    const tolerance = Number(options.tolerance) || 0;
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;

    const emptyResult = {
        marketKind: 'king',
        session: 'king',
        dateBucket,
        stakeTotal: 0,
        loss: { count: 0, minPercent: null, maxPercent: null, pattis: [] },
        bands: PROFIT_BANDS.map((b) => ({ band: b.label, pattis: [] })),
        matches: [],
        playedCount: 0,
        chartPannaCount: ALL_JODIS.length,
        totalCalculated: ALL_JODIS.length,
        allPattis: [],
        viewLabel: 'All bets',
    };

    const market = await Market.findById(marketId).select('marketType').lean();
    if (!market || market.marketType !== 'king') return emptyResult;

    const pendingBets = await loadKingBazaarPendingBets(marketId, {
        dateBucket,
        bookieUserIds: hasBookieFilter ? bookieUserIds : null,
    });

    const rates = await getRatesMap();
    const stakeTotal = round2(
        pendingBets
            .filter((b) => {
                const t = (b.betType || '').toLowerCase();
                return t === 'single' || t === 'jodi';
            })
            .reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
    );

    const playedJodis = collectPlayedJodis(pendingBets, options.playedPattis || []);
    const playedResults = computeJodiResults([...playedJodis], pendingBets, rates);
    const chartResults = computeJodiResults(ALL_JODIS, pendingBets, rates);
    const { loss, bands, allPattis } = buildBandsFromResults(chartResults);
    const matches = buildMatchesFromResults(playedResults, targetProfit, tolerance);

    return {
        marketKind: 'king',
        session: 'king',
        dateBucket,
        stakeTotal,
        playedCount: playedResults.length,
        chartPannaCount: chartResults.length,
        totalCalculated: chartResults.length,
        allPattis,
        loss,
        bands,
        matches,
        viewLabel: 'All bets',
        ratesUsed: {
            firstDigit: rates.single,
            secondDigit: rates.single,
            jodi: rates.jodi,
        },
    };
}
