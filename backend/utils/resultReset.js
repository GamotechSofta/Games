/**
 * Market result reset at midnight IST.
 * Market opens at midnight and closes at closing time; results are cleared at the start of each new day (IST)
 * so the same markets can be used for the next day with fresh results.
 * Before clearing, yesterday's result for each market is saved to MarketResult so view history is preserved.
 */

import MarketResult from '../models/marketResult/marketResult.js';
import Settings from '../models/settings/settings.js';

/** Current date in IST as YYYY-MM-DD */
export function getTodayIST() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/** Yesterday's date in IST as YYYY-MM-DD */
function getYesterdayIST() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

function computeDisplayResult(openingNumber, closingNumber) {
    const opening = openingNumber && /^\d{3}$/.test(String(openingNumber)) ? String(openingNumber) : null;
    const closing = closingNumber && /^\d{3}$/.test(String(closingNumber)) ? String(closingNumber) : null;
    const openingDisplay = opening ? opening : '***';
    const closingDisplay = closing ? closing : '***';
    const sumDigits = (s) => [...s].reduce((acc, c) => acc + parseInt(c, 10), 0);
    let displayResult = '***-**-***';
    if (opening) {
        const first = sumDigits(opening) % 10;
        if (!closing) {
            displayResult = `${openingDisplay}-${first}*-${closingDisplay}`;
        } else {
            const second = sumDigits(closing) % 10;
            displayResult = `${openingDisplay}-${first}${second}-${closingDisplay}`;
        }
    }
    return displayResult;
}

/**
 * Save current result of each market (that has opening/closing set) to MarketResult for yesterday's dateKey.
 * Ensures view history is preserved before we clear the live market documents.
 */
async function saveYesterdaySnapshotsToHistory(Market) {
    const yesterdayKey = getYesterdayIST();
    const cursor = Market.find({
        $or: [
            { openingNumber: { $nin: [null, ''] } },
            { closingNumber: { $nin: [null, ''] } },
        ],
    })
        .select('marketName openingNumber closingNumber')
        .lean()
        .cursor();

    const BATCH_SIZE = 200;
    let ops = [];
    for await (const m of cursor) {
        const displayResult = computeDisplayResult(m.openingNumber, m.closingNumber);
        ops.push({
            updateOne: {
                filter: { marketId: m._id, dateKey: yesterdayKey },
                update: {
                    $set: {
                        marketName: m.marketName,
                        openingNumber: m.openingNumber ?? null,
                        closingNumber: m.closingNumber ?? null,
                        displayResult: displayResult || '***-**-***',
                    },
                },
                upsert: true,
            },
        });
        if (ops.length >= BATCH_SIZE) {
            await MarketResult.bulkWrite(ops, { ordered: false });
            ops = [];
        }
    }
    if (ops.length > 0) {
        await MarketResult.bulkWrite(ops, { ordered: false });
    }
}

/**
 * Get the last reset date from database (persists across server restarts).
 * @returns {Promise<string|null>} Last reset date as YYYY-MM-DD or null if never reset
 */
async function getLastResetDateFromDB() {
    try {
        const setting = await Settings.findOne({ key: 'lastMarketResetDate' }).lean();
        return setting?.value || null;
    } catch (err) {
        console.error('[resultReset] Error fetching last reset date from DB:', err.message);
        return null;
    }
}

/**
 * Store the last reset date in database (persists across server restarts).
 * @param {string} dateKey - Date in YYYY-MM-DD format
 */
async function saveLastResetDateToDB(dateKey) {
    try {
        await Settings.findOneAndUpdate(
            { key: 'lastMarketResetDate' },
            { 
                value: dateKey,
                description: 'Last date when market results were reset at midnight IST',
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`[resultReset] 💾 Saved last reset date to database: ${dateKey}`);
    } catch (err) {
        console.error('[resultReset] Error saving last reset date to DB:', err.message);
    }
}

/** In-memory cache: we already ran the check for this IST date. Avoids running on every market API request. */
let lastCheckedDateIST = null;
let resetCheckInFlight = null;
let ensureResetInFlight = null;

/**
 * Fire-and-forget market reset check for read APIs — never block the HTTP response.
 * @param {Model} Market
 */
export function scheduleMarketResetCheck(Market) {
    const today = getTodayIST();
    if (lastCheckedDateIST === today) return;

    if (!resetCheckInFlight) {
        resetCheckInFlight = ensureResultsResetForNewDay(Market)
            .catch((err) => {
                console.error('[resultReset] background check failed:', err?.message || err);
            })
            .finally(() => {
                resetCheckInFlight = null;
            });
    }
}

/**
 * If we've crossed into a new calendar day (IST), save yesterday's results to history, then clear
 * openingNumber and closingNumber for all markets. View history (result-history by date) is preserved.
 * Called when fetching markets so admin and frontend always see reset results after midnight IST.
 * Only runs the full check once per day (IST); subsequent calls in the same day return immediately.
 * @param {Model} Market - Mongoose Market model
 */
export async function ensureResultsResetForNewDay(Market) {
    if (ensureResetInFlight) {
        await ensureResetInFlight;
        return;
    }
    ensureResetInFlight = (async () => {
    const today = getTodayIST();

    // Already ran for today (either skipped or performed reset) — no DB, no logs
    if (lastCheckedDateIST === today) return;

    // Get last reset date from database (persists across server restarts)
    const lastResetDate = await getLastResetDateFromDB();

    // If we've already reset today, skip (use < instead of <= to allow same-day resets if needed)
    if (lastResetDate !== null && today <= lastResetDate) {
        lastCheckedDateIST = today;
        return;
    }

    console.log(`[resultReset] New day reset starting for ${today} (last reset: ${lastResetDate || 'never'})`);
    
    if (lastResetDate !== null) {
        try {
            await saveYesterdaySnapshotsToHistory(Market);
        } catch (err) {
            console.error('[resultReset] Failed to save yesterday snapshots to history:', err.message);
        }
    }

    const result = await Market.updateMany(
        {},
        {
            $set: {
                openingNumber: null,
                closingNumber: null,
                result: null,
                winNumber: null,
            },
        }
    );

    await saveLastResetDateToDB(today);
    lastCheckedDateIST = today;

    console.log(`[resultReset] Completed reset for ${today}: ${result.modifiedCount} markets cleared`);
    })();
    try {
        await ensureResetInFlight;
    } finally {
        ensureResetInFlight = null;
    }
}
