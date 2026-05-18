import mongoose from 'mongoose';
import Bet from '../models/bet/bet.js';
import Market from '../models/market/market.js';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import { getRatesMap, DEFAULT_RATES } from '../models/rate/rate.js';

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

/** Pending open bet that matches declared result → payout (single rate or panna-type rate). */
export function computeDeclaredOpenWinPayout(bet, open3, lastDigitOpen, rates) {
    const amount = Number(bet?.amount) || 0;
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

/** Pending close bet matching declared close patti or ank → payout. */
export function computeDeclaredCloseWinPayout(bet, close3, lastDigitClose, rates) {
    const amount = Number(bet?.amount) || 0;
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
 * Settle opening: set market openingNumber, then mark single & panna bets as won/lost and credit winners.
 */
export async function settleOpening(marketId, openingNumber) {
    if (!openingNumber || !/^\d{3}$/.test(openingNumber)) {
        throw new Error('Opening number must be exactly 3 digits');
    }
    const market = await Market.findById(marketId);
    if (!market) throw new Error('Market not found');
    const canonicalId = market._id.toString();
    await Market.findByIdAndUpdate(marketId, { openingNumber });

    const rates = await getRatesMap();
    const openDigit = digitFromPatti(openingNumber);
    const open3 = openingNumber;

    const oid = toObjectId(canonicalId);
    const marketIdStr = String(canonicalId).trim();
    
    // Get today's midnight for scheduled bet filtering
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
                    { scheduledDate: { $lte: endTodayIST } }
                ]
            }
        ]
    }).lean();
    for (const bet of pendingBets) {
        const type = (bet.betType || '').toLowerCase();
        const num = (bet.betNumber || '').toString().trim();
        const amount = Number(bet.amount) || 0;

        if (type === 'single' && /^[0-9]$/.test(num)) {
            const won = openDigit != null && num === openDigit;
            const payout = won ? amount * getRateForKey(rates, 'single') : 0;
            await Bet.updateOne(
                { _id: bet._id },
                { status: won ? 'won' : 'lost', payout }
            );
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Single ${num})`,
                    referenceId: bet._id.toString(),
                });
            }
        } else if (type === 'panna' && /^[0-9]{3}$/.test(num)) {
            const won = num === open3;
            const pannaType = getPannaType(open3);
            const rateKey = pannaType || 'singlePatti';
            const payout = won ? amount * getRateForKey(rates, rateKey) : 0;
            await Bet.updateOne(
                { _id: bet._id },
                { status: won ? 'won' : 'lost', payout }
            );
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Panna ${num})`,
                    referenceId: bet._id.toString(),
                });
            }
        }
        /**
         * ═══════════════════════════════════════════════════════════════════════
         * HALFSANGAM: DO NOT PROCESS AT OPEN DECLARATION
         * ═══════════════════════════════════════════════════════════════════════
         * 
         * Half Sangam bets are NEVER evaluated during open result declaration.
         * They require cross-side matching which depends on ClosePana:
         * 
         *   - Open Halfsangam: OpenPana + CloseAnk (CloseAnk derived from ClosePana)
         *   - Close Halfsangam: OpenAnk + ClosePana (ClosePana directly matched)
         * 
         * Both formats need ClosePana to exist. These bets remain 'pending'
         * and will be evaluated ONLY in settleClosing() after close result.
         * 
         * DO NOT add Halfsangam processing here. See settleClosing() instead.
         * ═══════════════════════════════════════════════════════════════════════
         */
        // jodi, full-sangam also remain pending until closing
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
    const open3 = (market.openingNumber || '').toString();
    if (!/^\d{3}$/.test(open3)) throw new Error('Opening number must be set before declaring closing');
    await Market.findByIdAndUpdate(marketId, { closingNumber });

    const rates = await getRatesMap();
    const lastDigitOpen = digitFromPatti(open3);
    const lastDigitClose = digitFromPatti(closingNumber);
    const close3 = closingNumber;

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
        const type = (bet.betType || '').toLowerCase();
        const num = (bet.betNumber || '').toString().trim();
        const amount = Number(bet.amount) || 0;

        // CLOSE-session Single Digit (settles on closing digit)
        if (type === 'single' && (bet.betOn || '').toString().toLowerCase() === 'close' && /^[0-9]$/.test(num)) {
            const won = num === lastDigitClose;
            const payout = won ? amount * getRateForKey(rates, 'single') : 0;
            await Bet.updateOne({ _id: bet._id }, { status: won ? 'won' : 'lost', payout });
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Single ${num})`,
                    referenceId: bet._id.toString(),
                });
            }
        }
        // CLOSE-session Patti/Panna (settles on closing patti)
        else if (type === 'panna' && (bet.betOn || '').toString().toLowerCase() === 'close' && /^[0-9]{3}$/.test(num)) {
            const won = num === close3;
            const pannaType = getPannaType(close3);
            const rateKey = pannaType || 'singlePatti';
            const payout = won ? amount * getRateForKey(rates, rateKey) : 0;
            await Bet.updateOne({ _id: bet._id }, { status: won ? 'won' : 'lost', payout });
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Panna ${num})`,
                    referenceId: bet._id.toString(),
                });
            }
        }
        else if (type === 'jodi' && /^[0-9]{2}$/.test(num)) {
            const expectedJodi = (lastDigitOpen != null && lastDigitClose != null) ? (lastDigitOpen + lastDigitClose) : null;
            const won = expectedJodi != null && num === expectedJodi;
            const payout = won ? amount * getRateForKey(rates, 'jodi') : 0;
            await Bet.updateOne(
                { _id: bet._id },
                { status: won ? 'won' : 'lost', payout }
            );
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Jodi ${num})`,
                    referenceId: bet._id.toString(),
                });
            }
        } else if (type === 'half-sangam') {
            /**
             * ═══════════════════════════════════════════════════════════════════════
             * HALFSANGAM EVALUATION (CLOSE-RESULT DEPENDENT)
             * ═══════════════════════════════════════════════════════════════════════
             * 
             * TRIGGER CONDITION: This code runs ONLY when ClosePana exists.
             * The settleClosing() function validates ClosePana at entry point.
             * 
             * VALIDATION RULES (Cross-side matching):
             * 
             *   Format A (Open Halfsangam): "XXX-Y" = OpenPana + CloseAnk
             *     - XXX must match declared OpenPana (open3)
             *     - Y must match CloseAnk (derived from ClosePana → lastDigitClose)
             *     - Example: Bet "234-6" wins when OpenPana=234 and CloseAnk=6
             * 
             *   Format B (Close Halfsangam): "Y-XXX" = OpenAnk + ClosePana
             *     - Y must match OpenAnk (derived from OpenPana → lastDigitOpen)
             *     - XXX must match declared ClosePana (close3)
             *     - Example: Bet "2-222" wins when OpenAnk=2 and ClosePana=222
             * 
             * SAFETY: Only 'pending' bets are processed (idempotency guard).
             * Already processed bets (won/lost) are ignored by the query filter.
             * ═══════════════════════════════════════════════════════════════════════
             */
            
            // Guard: Skip if close result is invalid (extra safety check)
            if (!hasValidCloseResultForHalfsangam(open3, close3)) {
                // ClosePana invalid - skip this bet, it remains pending
                continue;
            }
            
            const parts = num.split('-').map((p) => (p || '').trim());
            const first = parts[0] || '';
            const second = parts[1] || '';
            const isFormatA = /^[0-9]{3}$/.test(first) && /^[0-9]$/.test(second);
            const isFormatB = /^[0-9]$/.test(first) && /^[0-9]{3}$/.test(second);
            
            let won = false;
            if (isFormatA) {
                // Open Halfsangam: OpenPana (first) + CloseAnk (second)
                // CloseAnk MUST be valid (derived from ClosePana)
                won = first === open3 && lastDigitClose != null && second === lastDigitClose;
            } else if (isFormatB) {
                // Close Halfsangam: OpenAnk (first) + ClosePana (second)
                // Both OpenAnk and ClosePana MUST be valid
                won = lastDigitOpen != null && first === lastDigitOpen && second === close3;
            }
            
            const payout = won ? amount * getRateForKey(rates, 'halfSangam') : 0;
            await Bet.updateOne(
                { _id: bet._id },
                { status: won ? 'won' : 'lost', payout }
            );
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Half Sangam)`,
                    referenceId: bet._id.toString(),
                });
            }
        } else if (type === 'full-sangam') {
            const parts = num.split('-');
            const betOpen3 = parts[0]?.trim() || '';
            const betClose3 = parts[1]?.trim() || '';
            const won = /^[0-9]{3}$/.test(betOpen3) && /^[0-9]{3}$/.test(betClose3) &&
                betOpen3 === open3 && betClose3 === close3;
            const payout = won ? amount * getRateForKey(rates, 'fullSangam') : 0;
            await Bet.updateOne(
                { _id: bet._id },
                { status: won ? 'won' : 'lost', payout }
            );
            if (won && payout > 0) {
                await Wallet.findOneAndUpdate(
                    { userId: bet.userId },
                    { $inc: { balance: payout } },
                    { upsert: true }
                );
                await WalletTransaction.create({
                    userId: bet.userId,
                    type: 'credit',
                    amount: payout,
                    description: `Win – ${market.marketName} (Full Sangam)`,
                    referenceId: bet._id.toString(),
                });
            }
        }
    }
}

/**
 * Preview declare open: for a proposed opening number, return totalBetAmount (single + panna only),
 * totalWinAmount (payout to winners for single + panna), noOfPlayers, profit,
 * totalBetAmountOnPatti (open pool bets matching declared open patti OR open ank),
 * totalPlayersBetOnPatti, totalPlayersInMarket,
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
    const playersBetOnPatti = new Set();
    const allMarketUserIds = new Set();

    for (const bet of allOpenBets) {
        const type = (bet.betType || '').toLowerCase();
        const rawNum = (bet.betNumber || '').toString().trim().replace(/\D/g, '');
        const amount = Number(bet.amount) || 0;
        const isPending = (bet.status || '').toString().toLowerCase() === 'pending';
        allMarketUserIds.add(bet.userId.toString());

        const matchesPatti = betMatchesDeclaredOpenPatti(bet, open3);
        const matchesAnk = betMatchesDeclaredOpenAnk(bet, lastDigitOpen);
        if (matchesPatti || matchesAnk) {
            totalBetAmountOnPatti += amount;
            playersBetOnPatti.add(bet.userId.toString());
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

    totalBetAmount = Math.round(totalBetAmount * 100) / 100;
    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    totalBetAmountOnPatti = Math.round(totalBetAmountOnPatti * 100) / 100;
    totalWinAmountOnPatti = Math.round(totalWinAmountOnPatti * 100) / 100;
    const profit = Math.round((totalBetAmountOnPatti - totalWinAmountOnPatti) * 100) / 100;

    return {
        totalBetAmount,
        noOfPlayers: userIds.size,
        profit,
        totalBetAmountOnPatti,
        totalWinAmountOnPatti,
        totalPlayersBetOnPatti: playersBetOnPatti.size,
        totalPlayersInMarket: allMarketUserIds.size,
        totalBetAmountHalfSangam,
        totalBetsHalfSangam: halfSangamBets.length,
        ...sessionMarketTotals,
    };
}

/**
 * Preview declare close: for pending jodi, half-sangam, full-sangam bets with given closing number.
 * Returns totalBetAmount, totalWinAmount, noOfPlayers, profit, totalBetAmountOnPatti, totalPlayersBetOnPatti, totalPlayersInMarket,
 * totalBetAmountMarketOpen / totalBetAmountMarketClose (today's stakes by Open/Close session).
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
    let totalBetAmount = 0;
    let totalWinAmount = 0;
    let totalBetAmountOnPatti = 0;
    const userIds = new Set();
    const playersBetOnPatti = new Set();
    const allMarketUserIds = new Set();

    /**
     * Determine if a bet settles at close time.
     * Half Sangam is included but will be guard-checked separately during evaluation.
     */
    const isCloseSettleTypeBet = (bet) => {
        const type = (bet.betType || '').toLowerCase();
        const isCloseSession = (bet.betOn || '').toString().toLowerCase() === 'close';
        // Half Sangam settles at closing (cross-side matching requires ClosePana)
        return type === 'jodi' || type === 'full-sangam' || type === 'half-sangam' || (type === 'single' && isCloseSession) || (type === 'panna' && isCloseSession);
    };

    if (!closingNumber || !/^\d{3}$/.test(closingNumber)) {
        for (const bet of allBetsToday) {
            allMarketUserIds.add(bet.userId.toString());
            if (isCloseSettleTypeBet(bet)) {
                const amt = Number(bet.amount) || 0;
                totalBetAmount += amt;
                userIds.add(bet.userId.toString());
            }
        }
        totalBetAmount = Math.round(totalBetAmount * 100) / 100;
        return {
            totalBetAmount,
            noOfPlayers: userIds.size,
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
    const lastDigitClose = digitFromPatti(closingNumber);
    const close3 = closingNumber;
    const pannaTypeClose = getPannaType(close3);
    const pannaRateKeyClose = pannaTypeClose || 'singlePatti';
    const pannaRateClose = getRateForKey(rates, pannaRateKeyClose);

    let totalWinAmountOnPatti = 0;
    let totalBetAmountOnClosePattiAndDigit = 0;
    const playersOnClosePattiAndDigit = new Set();

    for (const bet of allBetsToday) {
        const type = (bet.betType || '').toLowerCase();
        const num = (bet.betNumber || '').toString().trim();
        const amount = Number(bet.amount) || 0;
        const isPending = (bet.status || '').toString().toLowerCase() === 'pending';
        allMarketUserIds.add(bet.userId.toString());
        const isCloseSession = (bet.betOn || '').toString().toLowerCase() === 'close';

        const matchesClosePatti = betMatchesDeclaredClosePatti(bet, close3);
        const matchesCloseAnk = betMatchesDeclaredCloseAnk(bet, lastDigitClose);
        if (matchesClosePatti || matchesCloseAnk) {
            totalBetAmountOnClosePattiAndDigit += amount;
            playersOnClosePattiAndDigit.add(bet.userId.toString());
            if (isPending) {
                totalWinAmountOnPatti += computeDeclaredCloseWinPayout(bet, close3, lastDigitClose, rates);
            }
        }
        /**
         * ═══════════════════════════════════════════════════════════════════════
         * CLOSE-SETTLE TYPES: Bets evaluated at closing declaration
         * ═══════════════════════════════════════════════════════════════════════
         * 
         * These bet types are settled when ClosePana is declared:
         *   - jodi: OpenAnk + CloseAnk (both derived from Panas)
         *   - full-sangam: OpenPana + ClosePana
         *   - half-sangam: Cross-side matching (OpenPana+CloseAnk OR OpenAnk+ClosePana)
         *   - single (close session): CloseAnk
         *   - panna (close session): ClosePana
         * 
         * CRITICAL: half-sangam MUST be included here, otherwise bets like
         * "Open Ank 1 · Close Pana 100" (format "1-100") will be skipped!
         * ═══════════════════════════════════════════════════════════════════════
         */
        const isCloseSettleType =
            type === 'jodi' ||
            type === 'full-sangam' ||
            type === 'half-sangam' ||
            (type === 'single' && isCloseSession) ||
            (type === 'panna' && isCloseSession);
        if (!isCloseSettleType) continue;

        totalBetAmount += amount;
        userIds.add(bet.userId.toString());

        let isWinning = false;
        if (type === 'single' && isCloseSession && matchesCloseAnk) {
            playersBetOnPatti.add(bet.userId.toString());
            if (isPending) {
                const payout = amount * getRateForKey(rates, 'single');
                totalWinAmount += payout;
            }
            isWinning = true;
        } else if (type === 'panna' && isCloseSession && matchesClosePatti) {
            playersBetOnPatti.add(bet.userId.toString());
            if (isPending) {
                const payout = amount * pannaRateClose;
                totalWinAmount += payout;
            }
            isWinning = true;
        } else if (type === 'jodi' && /^[0-9]{2}$/.test(num)) {
            const expectedJodi = (lastDigitOpen != null && lastDigitClose != null) ? (lastDigitOpen + lastDigitClose) : null;
            if (expectedJodi != null && num === expectedJodi) {
                playersBetOnPatti.add(bet.userId.toString());
                if (isPending) {
                    const payout = amount * getRateForKey(rates, 'jodi');
                    totalWinAmount += payout;
                }
                isWinning = true;
            }
        } else if (type === 'half-sangam') {
            /**
             * Half Sangam: Cross-side matching preview
             * GUARD: Only evaluate if ClosePana is valid (not null/placeholder)
             * Format A (Open Halfsangam): "XXX-Y" = OpenPana + CloseAnk
             * Format B (Close Halfsangam): "Y-XXX" = OpenAnk + ClosePana
             */
            // Skip Half Sangam preview if close result is invalid
            if (!hasValidCloseResultForHalfsangam(open3, close3)) {
                continue;
            }
            
            const parts = (num || '').split('-').map((p) => (p || '').trim());
            const first = parts[0] || '';
            const second = parts[1] || '';
            const isFormatA = /^[0-9]{3}$/.test(first) && /^[0-9]$/.test(second);
            const isFormatB = /^[0-9]$/.test(first) && /^[0-9]{3}$/.test(second);
            
            let isHalfSangamWin = false;
            if (isFormatA) {
                // Open Halfsangam: OpenPana (first) + CloseAnk (second)
                isHalfSangamWin = first === open3 && lastDigitClose != null && second === lastDigitClose;
            } else if (isFormatB) {
                // Close Halfsangam: OpenAnk (first) + ClosePana (second)
                isHalfSangamWin = lastDigitOpen != null && first === lastDigitOpen && second === close3;
            }
            
            if (isHalfSangamWin) {
                playersBetOnPatti.add(bet.userId.toString());
                if (isPending) {
                    const payout = amount * getRateForKey(rates, 'halfSangam');
                    totalWinAmount += payout;
                }
                isWinning = true;
            }
        } else if (type === 'full-sangam') {
            const parts = (num || '').split('-').map((p) => (p || '').trim());
            const betOpen3 = parts[0] || '';
            const betClose3 = parts[1] || '';
            if (/^[0-9]{3}$/.test(betOpen3) && /^[0-9]{3}$/.test(betClose3) && betOpen3 === open3 && betClose3 === close3) {
                playersBetOnPatti.add(bet.userId.toString());
                if (isPending) {
                    const payout = amount * getRateForKey(rates, 'fullSangam');
                    totalWinAmount += payout;
                }
                isWinning = true;
            }
        }
    }

    totalBetAmountOnPatti = totalBetAmountOnClosePattiAndDigit;

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

    totalBetAmount = Math.round(totalBetAmount * 100) / 100;
    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    totalBetAmountOnPatti = Math.round(totalBetAmountOnPatti * 100) / 100;
    totalWinAmountOnPatti = Math.round(totalWinAmountOnPatti * 100) / 100;
    const profit = Math.round((totalBetAmountOnPatti - totalWinAmountOnPatti) * 100) / 100;
    return {
        totalBetAmount,
        noOfPlayers: userIds.size,
        profit,
        totalBetAmountOnPatti,
        totalWinAmountOnPatti,
        totalPlayersBetOnPatti: playersBetOnPatti.size,
        totalPlayersInMarket: allMarketUserIds.size,
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
    if (!oid) return { winningBets: [], totalWinAmount: 0 };
    const marketIdStr = String(marketId).trim();
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;
    // Half Sangam is NOT settled at open - uses cross-side matching and settles at closing
    const matchFilter = {
        status: 'pending',
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        betOn: { $ne: 'close' },
        betType: { $in: ['single', 'panna'] }, // Only single and panna settle at open
        ...todayRunFilter(),
    };
    if (hasBookieFilter) matchFilter.userId = { $in: bookieUserIds };
    const pendingBets = await Bet.find(matchFilter).lean();
    const rates = await getRatesMap();
    const lastDigitOpen = openingNumber && /^\d{3}$/.test(openingNumber) ? digitFromPatti(openingNumber) : null;
    const open3 = openingNumber && /^\d{3}$/.test(openingNumber) ? openingNumber : null;
    const winningBets = [];
    let totalWinAmount = 0;
    for (const bet of pendingBets) {
        const type = (bet.betType || '').toLowerCase();
        const num = (bet.betNumber || '').toString().trim();
        const amount = Number(bet.amount) || 0;
        let payout = 0;
        if (type === 'single' && /^[0-9]$/.test(num) && lastDigitOpen != null && num === lastDigitOpen) {
            payout = amount * getRateForKey(rates, 'single');
        } else if (type === 'panna' && /^[0-9]{3}$/.test(num) && open3 != null && num === open3) {
            const pannaType = getPannaType(open3);
            const rateKey = pannaType || 'singlePatti';
            payout = amount * getRateForKey(rates, rateKey);
        }
        if (payout > 0) {
            payout = Math.round(payout * 100) / 100;
            totalWinAmount += payout;
            winningBets.push({ bet: { _id: bet._id, userId: bet.userId, betType: bet.betType, betNumber: bet.betNumber, amount: bet.amount }, payout });
        }
    }
    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    return { winningBets, totalWinAmount };
}

/**
 * Get list of winning bets (with payout) for close declaration. Same filter as previewDeclareClose.
 */
export async function getWinningBetsForClose(marketId, closingNumber, options = {}) {
    const oid = toObjectId(marketId);
    if (!oid) return { winningBets: [], totalWinAmount: 0 };
    const market = await Market.findById(oid).lean();
    if (!market) return { winningBets: [], totalWinAmount: 0 };
    const open3 = (market.openingNumber || '').toString();
    if (!/^\d{3}$/.test(open3)) return { winningBets: [], totalWinAmount: 0 };
    if (!closingNumber || !/^\d{3}$/.test(closingNumber)) return { winningBets: [], totalWinAmount: 0 };

    const marketIdStr = String(marketId).trim();
    const bookieUserIds = options.bookieUserIds;
    const hasBookieFilter = Array.isArray(bookieUserIds) && bookieUserIds.length > 0;
    const matchFilter = {
        status: 'pending',
        $or: [{ marketId: oid }, { marketId: marketIdStr }],
        $and: [ todayRunFilter() ],
    };
    if (hasBookieFilter) matchFilter.userId = { $in: bookieUserIds };
    const pendingBets = await Bet.find(matchFilter).lean();
    const rates = await getRatesMap();
    const lastDigitOpen = digitFromPatti(open3);
    const lastDigitClose = digitFromPatti(closingNumber);
    const close3 = closingNumber;
    const pannaTypeClose = getPannaType(close3);
    const pannaRateKeyClose = pannaTypeClose || 'singlePatti';
    const winningBets = [];
    let totalWinAmount = 0;
    for (const bet of pendingBets) {
        const type = (bet.betType || '').toLowerCase();
        const num = (bet.betNumber || '').toString().trim();
        const amount = Number(bet.amount) || 0;
        const isCloseSession = (bet.betOn || '').toString().toLowerCase() === 'close';
        // Half Sangam is now settled at closing (cross-side matching)
        const isCloseSettleType =
            type === 'jodi' ||
            type === 'full-sangam' ||
            type === 'half-sangam' ||
            (type === 'single' && isCloseSession) ||
            (type === 'panna' && isCloseSession);
        if (!isCloseSettleType) continue;
        let payout = 0;
        if (type === 'single' && isCloseSession && /^[0-9]$/.test(num)) {
            if (num === lastDigitClose) payout = amount * getRateForKey(rates, 'single');
        } else if (type === 'panna' && isCloseSession && /^[0-9]{3}$/.test(num)) {
            if (num === close3) payout = amount * getRateForKey(rates, pannaRateKeyClose);
        } else if (type === 'jodi' && /^[0-9]{2}$/.test(num)) {
            const expectedJodi = (lastDigitOpen != null && lastDigitClose != null) ? (lastDigitOpen + lastDigitClose) : null;
            if (expectedJodi != null && num === expectedJodi) payout = amount * getRateForKey(rates, 'jodi');
        } else if (type === 'half-sangam') {
            /**
             * Half Sangam: Cross-side matching (winning bets)
             * GUARD: Only evaluate if ClosePana is valid
             * Format A (Open Halfsangam): "XXX-Y" = OpenPana + CloseAnk
             * Format B (Close Halfsangam): "Y-XXX" = OpenAnk + ClosePana
             */
            // Skip Half Sangam if close result is invalid
            if (!hasValidCloseResultForHalfsangam(open3, close3)) {
                continue;
            }
            
            const parts = (num || '').split('-').map((p) => (p || '').trim());
            const first = parts[0] || '';
            const second = parts[1] || '';
            const isFormatA = /^[0-9]{3}$/.test(first) && /^[0-9]$/.test(second);
            const isFormatB = /^[0-9]$/.test(first) && /^[0-9]{3}$/.test(second);
            
            if (isFormatA) {
                // Open Halfsangam: OpenPana (first) + CloseAnk (second)
                if (first === open3 && lastDigitClose != null && second === lastDigitClose) {
                    payout = amount * getRateForKey(rates, 'halfSangam');
                }
            } else if (isFormatB) {
                // Close Halfsangam: OpenAnk (first) + ClosePana (second)
                if (lastDigitOpen != null && first === lastDigitOpen && second === close3) {
                    payout = amount * getRateForKey(rates, 'halfSangam');
                }
            }
        } else if (type === 'full-sangam') {
            const parts = (num || '').split('-').map((p) => (p || '').trim());
            const betOpen3 = parts[0] || '';
            const betClose3 = parts[1] || '';
            if (/^[0-9]{3}$/.test(betOpen3) && /^[0-9]{3}$/.test(betClose3) && betOpen3 === open3 && betClose3 === close3) {
                payout = amount * getRateForKey(rates, 'fullSangam');
            }
        }
        if (payout > 0) {
            payout = Math.round(payout * 100) / 100;
            totalWinAmount += payout;
            winningBets.push({ bet: { _id: bet._id, userId: bet.userId, betType: bet.betType, betNumber: bet.betNumber, amount: bet.amount }, payout });
        }
    }
    totalWinAmount = Math.round(totalWinAmount * 100) / 100;
    return { winningBets, totalWinAmount };
}
