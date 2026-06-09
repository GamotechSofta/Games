import mongoose from 'mongoose';
import Bet from '../models/bet/bet.js';
import Market from '../models/market/market.js';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import { notifyPlayerWalletBalance } from './playerWalletNotify.js';
import { getRatesMap, DEFAULT_RATES } from '../models/rate/rate.js';
import { isSinglePatti, isDoublePatti } from './singlePattiUtils.js';

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

/**
 * Classify 3-digit panna as single/double/triple patti and return rate key.
 */
function getPannaType(digits) {
    if (!digits || digits.length !== 3) return null;
    const a = digits[0], b = digits[1], c = digits[2];
    if (a === b && b === c) return 'triplePatti';
    if (a === b || b === c || a === c) return 'doublePatti';
    return 'singlePatti';
}

/**
 * Get payout rate for a rate key. Uses DEFAULT_RATES as fallback so winning players always get correct rate.
 */
function getRateForKey(rates, key) {
    if (!key) return 0;
    const val = rates[key];
    if (val != null && Number.isFinite(Number(val)) && Number(val) >= 0) return Number(val);
    return (DEFAULT_RATES[key] != null && Number.isFinite(DEFAULT_RATES[key])) ? DEFAULT_RATES[key] : 0;
}

/**
 * Open/Close "Digit" (Ank) = last digit of sum of 3 digits (0–9).
 * Example: "156" → 1+5+6=12 → digit "2"
 */
function digitFromPatti(threeDigitStr) {
    const s = String(threeDigitStr || '').trim();
    if (!/^\d{3}$/.test(s)) return null;
    const sum = Number(s[0]) + Number(s[1]) + Number(s[2]);
    return String(sum % 10);
}

/** Normalize declared / bet panna to 3 digits. */
function normalizePana3(val) {
    const raw = String(val ?? '').replace(/\D/g, '').slice(0, 3);
    if (raw.length !== 3) return null;
    return raw.padStart(3, '0');
}

function isTriplePatti(patti) {
    const s = normalizePana3(patti);
    if (!s) return false;
    return s[0] === s[1] && s[1] === s[2];
}

/** Valid single / double / triple patti for half-sangam pana side. */
function isValidHalfSangamPana(digits) {
    const s = normalizePana3(digits);
    if (!s) return false;
    return isSinglePatti(s) || isDoublePatti(s) || isTriplePatti(s);
}

/**
 * Half Sangam betNumber — exactly two parts:
 * - Open Half (A): "PPP-A" = Open Pana (3) + Close Ank (1)
 * - Close Half (B): "A-PPP" = Open Ank (1) + Close Pana (3)
 * Invalid: no dash, 1 part, 3+ parts, 12-34, 1234-5, etc.
 */
export function parseHalfSangamBetNumber(betNumber) {
    const raw = String(betNumber ?? '').trim();
    if (!raw.includes('-')) return null;
    const parts = raw.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 2) return null;

    const [first, second] = parts;

    // Open Half: Open Pana - Close Ank (e.g. 234-6)
    if (/^[0-9]{3}$/.test(first) && /^[0-9]$/.test(second)) {
        const openPana = normalizePana3(first);
        if (!openPana || !isValidHalfSangamPana(openPana)) return null;
        return { format: 'open-half', openPana, closeAnk: second };
    }

    // Close Half: Open Ank - Close Pana (e.g. 9-222)
    if (/^[0-9]$/.test(first) && /^[0-9]{3}$/.test(second)) {
        const closePana = normalizePana3(second);
        if (!closePana || !isValidHalfSangamPana(closePana)) return null;
        return { format: 'close-half', openAnk: first, closePana };
    }

    return null;
}

/** True when declared open + close exist and bet matches cross-side half sangam rules. */
export function halfSangamMatchesDeclaredResult(parsed, open3, lastDigitOpen, close3, lastDigitClose) {
    if (!parsed || !hasValidCloseResultForHalfsangam(open3, close3)) return false;
    const declaredOpen = normalizePana3(open3);
    const declaredClose = normalizePana3(close3);
    if (!declaredOpen || !declaredClose) return false;
    if (lastDigitOpen == null || lastDigitClose == null) return false;

    if (parsed.format === 'open-half') {
        return parsed.openPana === declaredOpen && parsed.closeAnk === lastDigitClose;
    }
    if (parsed.format === 'close-half') {
        return parsed.openAnk === lastDigitOpen && parsed.closePana === declaredClose;
    }
    return false;
}

function computeHalfSangamPayout(bet, open3, close3, lastDigitOpen, lastDigitClose, rates) {
    const parsed = parseHalfSangamBetNumber(bet.betNumber);
    if (!parsed || !halfSangamMatchesDeclaredResult(parsed, open3, lastDigitOpen, close3, lastDigitClose)) {
        return 0;
    }
    const amount = Number(bet.amount) || 0;
    return amount > 0 ? amount * getRateForKey(rates, 'halfSangam') : 0;
}

/** Normalize declared / bet panna to 3 digits (e.g. "156", chart "BR-127" → "127"). */
function extractBetThreeDigit(betNumber) {
    const raw = String(betNumber || '').trim();
    if (/^[0-9]{3}$/.test(raw)) return raw.padStart(3, '0');
    const parts = raw.split('-').map((p) => p.trim());
    if (parts.length === 2) {
        const [a, b] = parts;
        if (/^[0-9]{3}$/.test(a) && /^[0-9]$/.test(b)) return null;
        if (/^[0-9]$/.test(a) && /^[0-9]{3}$/.test(b)) return null;
        if (/^[0-9]{3}$/.test(a) && /^[0-9]{3}$/.test(b)) return null;
        if (/^[0-9]{3}$/.test(b)) return b.padStart(3, '0');
    }
    const m = raw.match(/([0-9]{3})$/);
    return m ? m[1] : null;
}

/** Single-digit ank from bet number (single, odd-even, etc.) — not jodi/sangam keys. */
function extractBetSingleDigit(bet) {
    const type = (bet.betType || '').toLowerCase();
    if (type === 'jodi' || type === 'half-sangam' || type === 'full-sangam') return null;
    const digits = String(bet.betNumber || '').trim().replace(/\D/g, '');
    return /^[0-9]$/.test(digits) ? digits : null;
}

export function betMatchesDeclaredOpenPatti(bet, open3) {
    if (!open3) return false;
    const p3 = extractBetThreeDigit(bet.betNumber);
    return p3 != null && p3 === open3;
}

export function betMatchesDeclaredOpenAnk(bet, lastDigitOpen) {
    if (lastDigitOpen == null) return false;
    const d = extractBetSingleDigit(bet);
    return d != null && d === lastDigitOpen;
}

function getOddEvenRate(rates) {
    const v = getRateForKey(rates, 'oddEven');
    return v > 0 ? v : getRateForKey(rates, 'single');
}

/** Pending open bet that matches declared result → payout (single rate or panna-type rate). */
export function computeDeclaredOpenWinPayout(bet, open3, lastDigitOpen, rates) {
    const type = (bet.betType || '').toLowerCase();
    // Jodi / sangam settle only at close declare (cross-side for half sangam).
    if (isJodiOrSangamBetType(type)) return 0;
    if ((bet.betOn || '').toString().toLowerCase() === 'close') return 0;
    const amount = Number(bet?.amount) || 0;
    const num = (bet.betNumber || '').toString().trim();

    if (type === 'odd-even') {
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitOpen != null && d === lastDigitOpen) {
            return amount * getOddEvenRate(rates);
        }
        return 0;
    }
    if (type === 'sp-common') {
        const p3 = extractBetThreeDigit(num);
        if (p3 && p3 === open3 && isSinglePatti(p3)) {
            return amount * getRateForKey(rates, 'singlePatti');
        }
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitOpen != null && d === lastDigitOpen) {
            return amount * getRateForKey(rates, 'single');
        }
        return 0;
    }
    if (type === 'dp-common') {
        const p3 = extractBetThreeDigit(num);
        if (p3 && p3 === open3 && isDoublePatti(p3)) {
            return amount * getRateForKey(rates, 'doublePatti');
        }
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitOpen != null && d === lastDigitOpen) {
            return amount * getRateForKey(rates, 'single');
        }
        return 0;
    }
    if (type === 'cp-common') {
        const p3 = extractBetThreeDigit(num);
        if (p3 && p3 === open3) {
            const rateKey = getPannaType(p3) || 'singlePatti';
            return amount * getRateForKey(rates, rateKey);
        }
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitOpen != null && d === lastDigitOpen) {
            return amount * getRateForKey(rates, 'single');
        }
        return 0;
    }
    if (betMatchesDeclaredOpenAnk(bet, lastDigitOpen)) {
        return amount * getRateForKey(rates, 'single');
    }
    if (betMatchesDeclaredOpenPatti(bet, open3)) {
        const p3 = extractBetThreeDigit(bet.betNumber);
        const rateKey = (p3 && getPannaType(p3)) || 'singlePatti';
        return amount * getRateForKey(rates, rateKey);
    }
    return 0;
}

export function betMatchesDeclaredClosePatti(bet, close3) {
    if (!close3) return false;
    if ((bet.betOn || '').toString().toLowerCase() !== 'close') return false;
    const p3 = extractBetThreeDigit(bet.betNumber);
    return p3 != null && p3 === close3;
}

export function betMatchesDeclaredCloseAnk(bet, lastDigitClose) {
    if (lastDigitClose == null) return false;
    if ((bet.betOn || '').toString().toLowerCase() !== 'close') return false;
    const d = extractBetSingleDigit(bet);
    return d != null && d === lastDigitClose;
}

function isJodiOrSangamBetType(betType) {
    const t = (betType || '').toString().toLowerCase();
    return t === 'jodi' || t === 'half-sangam' || t === 'full-sangam';
}

/** Open-session bets in Patti + Single Digit pool (excludes jodi / sangam). */
function isBetInOpenPattiSingleDigitPool(bet) {
    if ((bet.betOn || '').toString().toLowerCase() === 'close') return false;
    return !isJodiOrSangamBetType(bet.betType);
}

/** Close-session bets in Patti + Single Digit pool (excludes jodi / sangam). */
function isBetInClosePattiSingleDigitPool(bet) {
    if ((bet.betOn || '').toString().toLowerCase() !== 'close') return false;
    return !isJodiOrSangamBetType(bet.betType);
}

async function creditWalletWin(bet, market, payout, description) {
    const rounded = Math.round(payout * 100) / 100;
    if (rounded <= 0) return;
    const wallet = await Wallet.findOneAndUpdate(
        { userId: bet.userId },
        { $inc: { balance: rounded } },
        { upsert: true, new: true }
    ).select('balance').lean();
    await WalletTransaction.create({
        userId: bet.userId,
        type: 'credit',
        amount: rounded,
        description: description || `Win – ${market.marketName}`,
        referenceId: bet._id.toString(),
    });
    const userId = bet.userId?._id?.toString?.() || bet.userId?.toString?.() || bet.userId;
    notifyPlayerWalletBalance(userId, 'bet_won', wallet?.balance).catch(() => {});
}

function winDescription(market, bet) {
    const type = (bet.betType || 'bet').toString();
    const num = (bet.betNumber || '').toString().trim();
    return `Win – ${market.marketName} (${type} ${num})`;
}

/** Pending close-session bet matching declared close patti / ank → payout. */
export function computeDeclaredCloseWinPayout(bet, close3, lastDigitClose, rates) {
    if ((bet.betOn || '').toString().toLowerCase() !== 'close') return 0;
    const amount = Number(bet?.amount) || 0;
    const type = (bet.betType || '').toLowerCase();
    const num = (bet.betNumber || '').toString().trim();

    if (type === 'odd-even') {
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitClose != null && d === lastDigitClose) {
            return amount * getOddEvenRate(rates);
        }
        return 0;
    }
    if (type === 'sp-common') {
        const p3 = extractBetThreeDigit(num);
        if (p3 && p3 === close3 && isSinglePatti(p3)) {
            return amount * getRateForKey(rates, 'singlePatti');
        }
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitClose != null && d === lastDigitClose) {
            return amount * getRateForKey(rates, 'single');
        }
        return 0;
    }
    if (type === 'dp-common') {
        const p3 = extractBetThreeDigit(num);
        if (p3 && p3 === close3 && isDoublePatti(p3)) {
            return amount * getRateForKey(rates, 'doublePatti');
        }
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitClose != null && d === lastDigitClose) {
            return amount * getRateForKey(rates, 'single');
        }
        return 0;
    }
    if (type === 'cp-common') {
        const p3 = extractBetThreeDigit(num);
        if (p3 && p3 === close3) {
            const rateKey = getPannaType(p3) || 'singlePatti';
            return amount * getRateForKey(rates, rateKey);
        }
        const d = extractBetSingleDigit(bet);
        if (d != null && lastDigitClose != null && d === lastDigitClose) {
            return amount * getRateForKey(rates, 'single');
        }
        return 0;
    }
    if (betMatchesDeclaredCloseAnk(bet, lastDigitClose)) {
        return amount * getRateForKey(rates, 'single');
    }
    if (betMatchesDeclaredClosePatti(bet, close3)) {
        const p3 = extractBetThreeDigit(bet.betNumber);
        const rateKey = (p3 && getPannaType(p3)) || 'singlePatti';
        return amount * getRateForKey(rates, rateKey);
    }
    return 0;
}

/** Bets settled when close is declared (today's pending pool). */
export function isCloseSettlePoolBet(bet) {
    const type = (bet.betType || '').toLowerCase();
    if (isJodiOrSangamBetType(type)) return true;
    return (bet.betOn || '').toString().toLowerCase() === 'close';
}

/** Full close-declare payout: jodi, sangam, close patti/digit pool (odd-even, commons, motors). */
export function computeCloseSettlePayout(bet, open3, close3, lastDigitOpen, lastDigitClose, rates) {
    const type = (bet.betType || '').toLowerCase();
    const num = (bet.betNumber || '').toString().trim();
    const amount = Number(bet.amount) || 0;
    if (!amount) return 0;

    if (type === 'jodi' && /^[0-9]{2}$/.test(num)) {
        const expectedJodi =
            lastDigitOpen != null && lastDigitClose != null ? lastDigitOpen + lastDigitClose : null;
        return expectedJodi != null && num === expectedJodi ? amount * getRateForKey(rates, 'jodi') : 0;
    }

    if (type === 'half-sangam') {
        return computeHalfSangamPayout(bet, open3, close3, lastDigitOpen, lastDigitClose, rates);
    }

    if (type === 'full-sangam') {
        const parts = num.split('-').map((p) => (p || '').trim());
        const betOpen3 = parts[0] || '';
        const betClose3 = parts[1] || '';
        if (
            /^[0-9]{3}$/.test(betOpen3) &&
            /^[0-9]{3}$/.test(betClose3) &&
            betOpen3 === open3 &&
            betClose3 === close3
        ) {
            return amount * getRateForKey(rates, 'fullSangam');
        }
        return 0;
    }

    return computeDeclaredCloseWinPayout(bet, close3, lastDigitClose, rates);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HALFSANGAM CLOSE-RESULT VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Halfsangam bets require BOTH OpenPana AND ClosePana to be declared before
 * they can be evaluated. This is because Halfsangam uses CROSS-SIDE matching:
 * 
 *   - Open Halfsangam (Format A: "XXX-Y") = OpenPana + CloseAnk
 *     → CloseAnk is derived from ClosePana, so ClosePana MUST exist
 * 
 *   - Close Halfsangam (Format B: "Y-XXX") = OpenAnk + ClosePana
 *     → ClosePana is directly matched, so ClosePana MUST exist
 * 
 * TRIGGER RULE: Halfsangam calculation runs ONLY when ClosePana exists.
 * If ClosePana is missing, null, placeholder ("***"), or invalid, skip entirely.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Check if a ClosePana value is valid for Halfsangam evaluation.
 * Returns true ONLY if ClosePana is a valid 3-digit number.
 * Returns false for: null, undefined, empty, "***", non-3-digit values.
 */
function isValidClosePana(closePana) {
    if (closePana == null) return false;
    const s = String(closePana).trim();
    if (!s || s === '***' || s === '**' || s === '*') return false;
    return /^\d{3}$/.test(s);
}

/**
 * Check if a market has valid close result for Halfsangam evaluation.
 * Both OpenPana and ClosePana must be valid 3-digit numbers.
 */
function hasValidCloseResultForHalfsangam(openPana, closePana) {
    const openValid = openPana != null && /^\d{3}$/.test(String(openPana).trim());
    const closeValid = isValidClosePana(closePana);
    return openValid && closeValid;
}

/** Today in IST (YYYY-MM-DD) – same as getMarketStats so scheduled bets roll over correctly. */
function getTodayKeyIST() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function getTodayISTRange() {
    const todayKey = getTodayKeyIST();
    return {
        start: new Date(`${todayKey}T00:00:00+05:30`),
        end: new Date(`${todayKey}T23:59:59.999+05:30`),
    };
}

/** End of today in IST – for scheduledDate <= today (so 17/02 scheduled bets settle on 17/02 IST). */
function getTodayEndIST() {
    const todayKey = getTodayKeyIST();
    return new Date(`${todayKey}T23:59:59.999+05:30`);
}

/**
 * MongoDB condition: include bets that belong to "today's run" – either placed today (IST) without schedule,
 * or scheduled for today (IST) regardless of when they were placed (e.g. placed 16/02 for 17/02).
 */
function todayRunFilter() {
    const todayIST = getTodayISTRange();
    const endTodayIST = getTodayEndIST();
    return {
        $or: [
            { createdAt: { $gte: todayIST.start, $lte: todayIST.end }, $or: [ { isScheduled: { $ne: true } }, { scheduledDate: { $exists: false } }, { scheduledDate: null } ] },
            { scheduledDate: { $gte: todayIST.start, $lte: endTodayIST } },
        ],
    };
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

/** Open vs Close session — same rules as admin getMarketStats */
function resolveMarketSessionForBetTotals(bet, startMin) {
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

/**
 * Sum of all non-cancelled bet amounts for today's run, split by Open vs Close session (admin preview / bookie scope).
 */
async function getOpenCloseMarketBetTotals(marketId, options = {}) {
    const oid = toObjectId(marketId);
    if (!oid) {
        return { totalBetAmountMarketOpen: 0, totalBetAmountMarketClose: 0 };
    }
    const marketIdStr = String(marketId).trim();
    const market = await Market.findById(oid).select('startingTime').lean();
    const startMin = parseHHMMForSession(market?.startingTime);
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;

    const match = {
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        status: { $ne: 'cancelled' },
        $and: [todayRunFilter()],
    };
    if (hasBookieFilter) match.userId = { $in: bookieUserIds };

    const bets = await Bet.find(match).lean();
    let openSum = 0;
    let closeSum = 0;
    for (const b of bets) {
        const amount = Number(b.amount) || 0;
        const session = resolveMarketSessionForBetTotals(b, startMin);
        if (session === 'close') closeSum += amount;
        else openSum += amount;
    }
    return {
        totalBetAmountMarketOpen: Math.round(openSum * 100) / 100,
        totalBetAmountMarketClose: Math.round(closeSum * 100) / 100,
    };
}

/** Legacy: scheduledDate <= end of today IST (use for simple $lte checks). */
function getTodayMidnight() {
    return getTodayEndIST();
}

/**
 * Helper: Check if a bet should be settled today (IST).
 * Returns true if bet is NOT scheduled OR if it's scheduled for today or earlier in IST.
 */
function shouldSettleToday(bet) {
    if (!bet.isScheduled || !bet.scheduledDate) return true;
    const endTodayIST = getTodayEndIST();
    const schedDate = new Date(bet.scheduledDate);
    return schedDate.getTime() <= endTodayIST.getTime();
}

/**
 * Settle opening: set market openingNumber, then settle all open-session patti/single-digit
 * pool bets (single, panna, odd-even, motors, chart, etc.) — same match + payout as preview.
 * Jodi / half-sangam / full-sangam remain pending until close.
 */
export async function settleOpening(marketId, openingNumber) {
    if (!openingNumber || !/^\d{3}$/.test(openingNumber)) {
        throw new Error('Opening number must be exactly 3 digits');
    }
    const market = await Market.findById(marketId);
    if (!market) throw new Error('Market not found');
    const canonicalId = market._id.toString();
    const openNumRaw = openingNumber.toString().replace(/\D/g, '').slice(0, 3);
    const open3 = openNumRaw.padStart(3, '0');
    await Market.findByIdAndUpdate(marketId, { openingNumber: open3 });

    const rates = await getRatesMap();
    const lastDigitOpen = digitFromPatti(open3);

    const oid = toObjectId(canonicalId);
    const marketIdStr = String(canonicalId).trim();

    const endTodayIST = getTodayEndIST();
    const pendingBets = await Bet.find({
        status: 'pending',
        $or: oid ? [{ marketId: oid }, { marketId: marketIdStr }] : [{ marketId: marketIdStr }],
        betOn: { $ne: 'close' },
        $and: [
            {
                $or: [
                    { isScheduled: { $ne: true } },
                    { scheduledDate: { $exists: false } },
                    { scheduledDate: null },
                    { scheduledDate: { $lte: endTodayIST } },
                ],
            },
        ],
    }).lean();

    for (const bet of pendingBets) {
        if (isJodiOrSangamBetType(bet.betType)) continue;
        if (!isBetInOpenPattiSingleDigitPool(bet)) continue;

        const matchesPatti = betMatchesDeclaredOpenPatti(bet, open3);
        const matchesAnk = betMatchesDeclaredOpenAnk(bet, lastDigitOpen);
        const payout =
            matchesPatti || matchesAnk
                ? computeDeclaredOpenWinPayout(bet, open3, lastDigitOpen, rates)
                : 0;
        const rounded = Math.round(payout * 100) / 100;
        const won = rounded > 0;

        await Bet.updateOne(
            { _id: bet._id },
            { status: won ? 'won' : 'lost', payout: rounded }
        );
        if (won) {
            await creditWalletWin(bet, market, rounded, winDescription(market, bet));
        }
    }
}

/**
 * Settle closing: set market closingNumber, then settle jodi, half-sangam, full-sangam.
 */
export async function settleClosing(marketId, closingNumber) {
    if (!closingNumber || !/^\d{3}$/.test(closingNumber)) {
        throw new Error('Closing number must be exactly 3 digits');
    }
    const market = await Market.findById(marketId);
    if (!market) throw new Error('Market not found');
    const open3 = normalizePana3(market.openingNumber);
    if (!open3) throw new Error('Opening number must be set before declaring closing');
    const closeNumRaw = closingNumber.toString().replace(/\D/g, '').slice(0, 3);
    const close3 = closeNumRaw.padStart(3, '0');
    await Market.findByIdAndUpdate(marketId, { closingNumber: close3 });

    const rates = await getRatesMap();
    const lastDigitOpen = digitFromPatti(open3);
    const lastDigitClose = digitFromPatti(close3);

    const canonicalId = market._id.toString();
    const oid = toObjectId(canonicalId);
    const marketIdStr = String(canonicalId).trim();
    
    const endTodayIST = getTodayEndIST();
    const pendingBets = await Bet.find({
        status: 'pending',
        $or: oid ? [{ marketId: oid }, { marketId: marketIdStr }] : [{ marketId: marketIdStr }],
        $and: [
            {
                $or: [
                    { isScheduled: { $ne: true } },
                    { scheduledDate: { $exists: false } },
                    { scheduledDate: null },
                    { scheduledDate: { $lte: endTodayIST } }
                ]
            }
        ]
    }).lean();
    for (const bet of pendingBets) {
        if (!isCloseSettlePoolBet(bet)) continue;
        const payout = computeCloseSettlePayout(bet, open3, close3, lastDigitOpen, lastDigitClose, rates);
        const rounded = Math.round(payout * 100) / 100;
        const won = rounded > 0;
        await Bet.updateOne(
            { _id: bet._id },
            { status: won ? 'won' : 'lost', payout: rounded }
        );
        if (won) {
            await creditWalletWin(bet, market, rounded, winDescription(market, bet));
        }
    }
}

/**
 * Preview declare open: for a proposed opening number, return totalBetAmount (single + panna only),
 * totalWinAmount (payout to all open-settle winners: single + panna),
 * profit (totalBetAmountMarketOpen − totalWinAmountOnPatti),
 * totalBetAmountOnPatti (matching declared open patti OR open ank),
 * noOfPlayers (unique users in open Patti + Single Digit pool),
 * totalPlayersBetOnPatti (unique users with matching patti or ank), totalPlayersInMarket,
 * totalBetAmountMarketOpen / totalBetAmountMarketClose (all stakes today by session, same as Market Detail).
 * Win payout at open: only single + panna bet types.
 * @param {string} marketId - Market ID
 * @param {string|null} openingNumber - 3-digit open number e.g. "123"
 * @param {{ bookieUserIds?: string[]|null }} [options] - If bookieUserIds is non-null and non-empty, filter bets by these user IDs (same scope as market stats).
 */
export async function previewDeclareOpen(marketId, openingNumber, options = {}) {
    const oid = toObjectId(marketId);
    if (!oid) {
        return {
            totalBetAmount: 0,
            noOfPlayers: 0,
            profit: 0,
            totalBetAmountOnPatti: 0,
            totalWinAmountOnPatti: 0,
            totalPlayersBetOnPatti: 0,
            totalPlayersInMarket: 0,
            totalBetAmountMarketOpen: 0,
            totalBetAmountMarketClose: 0,
            jodiStartDigit: null,
            totalJodiBets: 0,
            startDigitJodiBets: 0,
            jodiStartDigitPercent: 0,
        };
    }
    const marketIdStr = String(marketId).trim();
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;
    const sessionMarketTotals = await getOpenCloseMarketBetTotals(marketId, { bookieUserIds: hasBookieFilter ? bookieUserIds : undefined });

    // Same scope as getMarketStats: today's run = placed today (IST) or scheduled for today (IST)
    const matchFilterAll = {
        marketId: oid,
        betOn: { $ne: 'close' },
        status: { $ne: 'cancelled' },
        ...todayRunFilter(),
    };
    if (hasBookieFilter) matchFilterAll.userId = { $in: bookieUserIds };

    const allOpenBets = await Bet.find(matchFilterAll).lean();

    const rates = await getRatesMap();
    // Normalize opening number: digits only, exactly 3 (pad with 0), so "12" -> "012", "156" -> "156"
    const openNumRaw = (openingNumber || '').toString().replace(/\D/g, '').slice(0, 3);
    const open3 = openNumRaw.length === 3 ? openNumRaw.padStart(3, '0') : null;
    const lastDigitOpen = open3 ? digitFromPatti(open3) : null;

    let totalBetAmount = 0;
    let totalWinAmount = 0;
    let totalBetAmountOnPatti = 0;
    let totalWinAmountOnPatti = 0;
    const userIds = new Set();
    const playersInPattiPool = new Set();
    const playersWonOnPatti = new Set();
    const allMarketUserIds = new Set();

    for (const bet of allOpenBets) {
        const type = (bet.betType || '').toLowerCase();
        const rawNum = (bet.betNumber || '').toString().trim().replace(/\D/g, '');
        const amount = Number(bet.amount) || 0;
        const isPending = (bet.status || '').toString().toLowerCase() === 'pending';
        allMarketUserIds.add(bet.userId.toString());

        if (isBetInOpenPattiSingleDigitPool(bet)) {
            playersInPattiPool.add(bet.userId.toString());
        }

        const matchesPatti = betMatchesDeclaredOpenPatti(bet, open3);
        const matchesAnk = betMatchesDeclaredOpenAnk(bet, lastDigitOpen);
        if (matchesPatti || matchesAnk) {
            totalBetAmountOnPatti += amount;
            playersWonOnPatti.add(bet.userId.toString());
            if (isPending) {
                const payout = computeDeclaredOpenWinPayout(bet, open3, lastDigitOpen, rates);
                totalWinAmountOnPatti += payout;
            }
        }

        // Settlement pool at open (single + panna) — used for noOfPlayers count
        if (type === 'single' && /^[0-9]$/.test(rawNum)) {
            totalBetAmount += amount;
            userIds.add(bet.userId.toString());
            if (matchesAnk && isPending) {
                totalWinAmount += amount * getRateForKey(rates, 'single');
            }
        } else if (type === 'panna' && rawNum.length >= 3) {
            totalBetAmount += amount;
            userIds.add(bet.userId.toString());
            if (matchesPatti && isPending) {
                const p3 = extractBetThreeDigit(bet.betNumber) || rawNum.slice(0, 3).padStart(3, '0');
                const rateKey = (p3 && getPannaType(p3)) || 'singlePatti';
                totalWinAmount += amount * getRateForKey(rates, rateKey);
            }
        }
    }

    // Half Sangam: NOT settled at open - only count bet amounts for stats (no win calculation)
    // Half Sangam uses cross-side matching and is settled at closing:
    // - Open Halfsangam (Format A): Open Pana + Close Ank
    // - Close Halfsangam (Format B): Open Ank + Close Pana
    const matchHalfSangam = {
        marketId: oid,
        betType: 'half-sangam',
        status: { $ne: 'cancelled' },
        ...todayRunFilter(),
    };
    if (hasBookieFilter) matchHalfSangam.userId = { $in: bookieUserIds };
    let totalBetAmountHalfSangam = 0;
    const halfSangamBets = await Bet.find(matchHalfSangam).lean();
    for (const bet of halfSangamBets) {
        const amount = Number(bet.amount) || 0;
        totalBetAmountHalfSangam += amount;
        allMarketUserIds.add(bet.userId.toString());
        // Note: Half Sangam bets are not included in totalBetAmount for open preview
        // as they will be settled at closing time
    }
    totalBetAmountHalfSangam = Math.round(totalBetAmountHalfSangam * 100) / 100;

    // Jodi % (start digit = open ank): today's 2-digit jodi bets where 1st digit matches open ank
    const matchJodi = {
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        betType: 'jodi',
        status: { $ne: 'cancelled' },
        ...todayRunFilter(),
    };
    if (hasBookieFilter) matchJodi.userId = { $in: bookieUserIds };
    const jodiBetsToday = await Bet.find(matchJodi).lean();
    let totalJodiBets = 0;
    let startDigitJodiBets = 0;
    const jodiStartDigit = lastDigitOpen;
    for (const bet of jodiBetsToday) {
        const jodiNum = (bet.betNumber || '').toString().trim().replace(/\D/g, '');
        if (!/^[0-9]{2}$/.test(jodiNum)) continue;
        totalJodiBets += 1;
        if (jodiStartDigit != null && jodiNum[0] === jodiStartDigit) {
            startDigitJodiBets += 1;
        }
    }
    const jodiStartDigitPercent =
        totalJodiBets > 0
            ? Math.round((startDigitJodiBets / totalJodiBets) * 10000) / 100
            : 0;

    totalBetAmount = Math.round(totalBetAmount * 100) / 100;
    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    totalBetAmountOnPatti = Math.round(totalBetAmountOnPatti * 100) / 100;
    totalWinAmountOnPatti = Math.round(totalWinAmountOnPatti * 100) / 100;
    const totalBetAmountMarketOpen = Number(sessionMarketTotals.totalBetAmountMarketOpen) || 0;
    // Total Profit = market open stakes − win payout on matching patti + single digit (open)
    const profit = Math.round((totalBetAmountMarketOpen - totalWinAmountOnPatti) * 100) / 100;

    return {
        totalBetAmount,
        totalWinAmount,
        noOfPlayers: playersInPattiPool.size,
        profit,
        totalBetAmountOnPatti,
        totalWinAmountOnPatti,
        totalPlayersBetOnPatti: playersWonOnPatti.size,
        totalPlayersInMarket: allMarketUserIds.size,
        totalBetAmountHalfSangam,
        totalBetsHalfSangam: halfSangamBets.length,
        jodiStartDigit,
        totalJodiBets,
        startDigitJodiBets,
        jodiStartDigitPercent,
        ...sessionMarketTotals,
    };
}

/**
 * Close Check preview stats from today's bets (same rules as settleClosing).
 */
export function computeClosePreviewFromBets(allBetsToday, { open3, close3, lastDigitOpen, lastDigitClose, rates }) {
    let totalBetAmount = 0;
    let totalWinAmount = 0;
    let totalBetAmountOnPatti = 0;
    let totalWinAmountOnPatti = 0;
    const playersInClosePool = new Set();
    const playersWon = new Set();
    const allMarketUserIds = new Set();

    for (const bet of allBetsToday) {
        const amount = Number(bet.amount) || 0;
        const isPending = (bet.status || '').toString().toLowerCase() === 'pending';
        allMarketUserIds.add(bet.userId.toString());

        if (!isCloseSettlePoolBet(bet)) continue;

        playersInClosePool.add(bet.userId.toString());
        totalBetAmount += amount;

        const payout = computeCloseSettlePayout(bet, open3, close3, lastDigitOpen, lastDigitClose, rates);
        if (payout > 0) {
            totalBetAmountOnPatti += amount;
            playersWon.add(bet.userId.toString());
            if (isPending) {
                totalWinAmount += payout;
                totalWinAmountOnPatti += payout;
            }
        }
    }

    totalBetAmount = Math.round(totalBetAmount * 100) / 100;
    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    totalBetAmountOnPatti = Math.round(totalBetAmountOnPatti * 100) / 100;
    totalWinAmountOnPatti = Math.round(totalWinAmountOnPatti * 100) / 100;
    const profit = Math.round((totalBetAmount - totalWinAmount) * 100) / 100;

    return {
        totalBetAmount,
        totalWinAmount,
        totalBetAmountOnPatti,
        totalWinAmountOnPatti,
        noOfPlayers: playersInClosePool.size,
        totalPlayersBetOnPatti: playersWon.size,
        totalPlayersInMarket: allMarketUserIds.size,
        profit,
    };
}

/**
 * Preview declare close: close-settle pool stats + profit (totalBetAmount − totalWinAmount).
 * @param {{ bookieUserIds?: string[]|null }} [options] - If bookieUserIds is non-null and non-empty, filter bets by these user IDs.
 */
export async function previewDeclareClose(marketId, closingNumber, options = {}) {
    const oid = toObjectId(marketId);
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;

    if (!oid) {
        return {
            totalBetAmount: 0,
            noOfPlayers: 0,
            profit: 0,
            totalBetAmountOnPatti: 0,
            totalWinAmountOnPatti: 0,
            totalPlayersBetOnPatti: 0,
            totalPlayersInMarket: 0,
            totalBetAmountHalfSangam: 0,
            totalBetsHalfSangam: 0,
            totalBetAmountMarketOpen: 0,
            totalBetAmountMarketClose: 0,
        };
    }

    const sessionMarketTotals = await getOpenCloseMarketBetTotals(marketId, { bookieUserIds: hasBookieFilter ? bookieUserIds : undefined });

    const market = await Market.findById(oid).lean();
    if (!market) {
        return {
            totalBetAmount: 0,
            noOfPlayers: 0,
            profit: 0,
            totalBetAmountOnPatti: 0,
            totalWinAmountOnPatti: 0,
            totalPlayersBetOnPatti: 0,
            totalPlayersInMarket: 0,
            totalBetAmountHalfSangam: 0,
            totalBetsHalfSangam: 0,
            ...sessionMarketTotals,
        };
    }
    const open3 = (market.openingNumber || '').toString();
    if (!/^\d{3}$/.test(open3)) {
        return {
            totalBetAmount: 0,
            noOfPlayers: 0,
            profit: 0,
            totalBetAmountOnPatti: 0,
            totalWinAmountOnPatti: 0,
            totalPlayersBetOnPatti: 0,
            totalPlayersInMarket: 0,
            totalBetAmountHalfSangam: 0,
            totalBetsHalfSangam: 0,
            ...sessionMarketTotals,
        };
    }

    const marketIdStr = String(marketId).trim();

    const matchFilterAll = {
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        status: { $ne: 'cancelled' },
        $and: [ todayRunFilter() ],
    };
    if (hasBookieFilter) matchFilterAll.userId = { $in: bookieUserIds };

    const allBetsToday = await Bet.find(matchFilterAll).lean();

    if (!closingNumber || !/^\d{3}$/.test(closingNumber)) {
        let totalBetAmount = 0;
        const playersInClosePool = new Set();
        const allMarketUserIds = new Set();
        for (const bet of allBetsToday) {
            allMarketUserIds.add(bet.userId.toString());
            if (!isCloseSettlePoolBet(bet)) continue;
            totalBetAmount += Number(bet.amount) || 0;
            playersInClosePool.add(bet.userId.toString());
        }
        totalBetAmount = Math.round(totalBetAmount * 100) / 100;
        return {
            totalBetAmount,
            noOfPlayers: playersInClosePool.size,
            profit: totalBetAmount,
            totalBetAmountOnPatti: 0,
            totalWinAmountOnPatti: 0,
            totalPlayersBetOnPatti: 0,
            totalPlayersInMarket: allMarketUserIds.size,
            totalBetAmountHalfSangam: 0,
            totalBetsHalfSangam: 0,
            ...sessionMarketTotals,
        };
    }

    const rates = await getRatesMap();
    const lastDigitOpen = digitFromPatti(open3);
    const closeNumRaw = closingNumber.toString().replace(/\D/g, '').slice(0, 3);
    const close3 = closeNumRaw.padStart(3, '0');
    const lastDigitClose = digitFromPatti(close3);

    const previewStats = computeClosePreviewFromBets(allBetsToday, {
        open3,
        close3,
        lastDigitOpen,
        lastDigitClose,
        rates,
    });

    // Count Half Sangam bets for stats
    const matchHalfSangam = {
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        betType: 'half-sangam',
        status: { $ne: 'cancelled' },
        ...todayRunFilter(),
    };
    if (hasBookieFilter) matchHalfSangam.userId = { $in: bookieUserIds };
    const halfSangamBets = await Bet.find(matchHalfSangam).lean();
    let totalBetAmountHalfSangam = 0;
    for (const bet of halfSangamBets) {
        totalBetAmountHalfSangam += Number(bet.amount) || 0;
    }
    totalBetAmountHalfSangam = Math.round(totalBetAmountHalfSangam * 100) / 100;

    return {
        ...previewStats,
        totalBetAmountHalfSangam,
        totalBetsHalfSangam: halfSangamBets.length,
        ...sessionMarketTotals,
    };
}

/**
 * Get list of winning bets (with payout) for open declaration. Same filter as previewDeclareOpen.
 */
export async function getWinningBetsForOpen(marketId, openingNumber, options = {}) {
    const oid = toObjectId(marketId);
    if (!oid) return { winningBets: [], totalWinAmount: 0, totalPlayersBetOnPatti: 0 };
    const marketIdStr = String(marketId).trim();
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;
    const openNumRaw = (openingNumber || '').toString().replace(/\D/g, '').slice(0, 3);
    const open3 = openNumRaw.length === 3 ? openNumRaw.padStart(3, '0') : null;
    if (!open3) return { winningBets: [], totalWinAmount: 0, totalPlayersBetOnPatti: 0 };
    const lastDigitOpen = digitFromPatti(open3);

    const endTodayIST = getTodayEndIST();
    const matchFilter = {
        status: 'pending',
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        betOn: { $ne: 'close' },
        $and: [
            {
                $or: [
                    { isScheduled: { $ne: true } },
                    { scheduledDate: { $exists: false } },
                    { scheduledDate: null },
                    { scheduledDate: { $lte: endTodayIST } },
                ],
            },
        ],
    };
    if (hasBookieFilter) matchFilter.userId = { $in: bookieUserIds };
    const pendingBets = await Bet.find(matchFilter).lean();
    const rates = await getRatesMap();
    const winningBets = [];
    const wonPlayerIds = new Set();

    for (const bet of pendingBets) {
        if (isJodiOrSangamBetType(bet.betType)) continue;
        if (!isBetInOpenPattiSingleDigitPool(bet)) continue;

        const matchesPatti = betMatchesDeclaredOpenPatti(bet, open3);
        const matchesAnk = betMatchesDeclaredOpenAnk(bet, lastDigitOpen);
        if (!matchesPatti && !matchesAnk) continue;

        const payout = computeDeclaredOpenWinPayout(bet, open3, lastDigitOpen, rates);
        if (payout <= 0) continue;

        const rounded = Math.round(payout * 100) / 100;
        wonPlayerIds.add(bet.userId.toString());
        winningBets.push({
            bet: {
                _id: bet._id,
                userId: bet.userId,
                betType: bet.betType,
                betNumber: bet.betNumber,
                amount: bet.amount,
                betOn: bet.betOn,
            },
            payout: rounded,
        });
    }

    const totalWinAmount =
        Math.round(winningBets.reduce((sum, w) => sum + (Number(w.payout) || 0), 0) * 100) / 100;
    return {
        winningBets,
        totalWinAmount,
        totalPlayersBetOnPatti: wonPlayerIds.size,
    };
}

/**
 * Get list of winning bets (with payout) for close declaration. Same filter as previewDeclareClose.
 */
export async function getWinningBetsForClose(marketId, closingNumber, options = {}) {
    const oid = toObjectId(marketId);
    if (!oid) return { winningBets: [], totalWinAmount: 0, totalPlayersBetOnPatti: 0 };
    const market = await Market.findById(oid).lean();
    if (!market) return { winningBets: [], totalWinAmount: 0, totalPlayersBetOnPatti: 0 };
    const open3 = (market.openingNumber || '').toString();
    if (!/^\d{3}$/.test(open3)) return { winningBets: [], totalWinAmount: 0, totalPlayersBetOnPatti: 0 };
    if (!closingNumber || !/^\d{3}$/.test(closingNumber)) {
        return { winningBets: [], totalWinAmount: 0, totalPlayersBetOnPatti: 0 };
    }

    const marketIdStr = String(marketId).trim();
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;
    const matchFilter = {
        status: 'pending',
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        $and: [todayRunFilter()],
    };
    if (hasBookieFilter) matchFilter.userId = { $in: bookieUserIds };
    const pendingBets = await Bet.find(matchFilter).lean();
    const rates = await getRatesMap();
    const lastDigitOpen = digitFromPatti(open3);
    const closeNumRaw = closingNumber.toString().replace(/\D/g, '').slice(0, 3);
    const close3 = closeNumRaw.padStart(3, '0');
    const lastDigitClose = digitFromPatti(close3);

    const winningBets = [];
    const wonPlayerIds = new Set();
    let totalWinAmount = 0;

    for (const bet of pendingBets) {
        if (!isCloseSettlePoolBet(bet)) continue;
        const payout = computeCloseSettlePayout(bet, open3, close3, lastDigitOpen, lastDigitClose, rates);
        if (payout <= 0) continue;
        const rounded = Math.round(payout * 100) / 100;
        totalWinAmount += rounded;
        wonPlayerIds.add(bet.userId.toString());
        winningBets.push({
            bet: {
                _id: bet._id,
                userId: bet.userId,
                betType: bet.betType,
                betNumber: bet.betNumber,
                amount: bet.amount,
            },
            payout: rounded,
        });
    }

    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    return {
        winningBets,
        totalWinAmount,
        totalPlayersBetOnPatti: wonPlayerIds.size,
    };
}
