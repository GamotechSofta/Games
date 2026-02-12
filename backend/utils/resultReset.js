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
    const marketsWithResults = await Market.find({
        $or: [
            { openingNumber: { $nin: [null, ''] } },
            { closingNumber: { $nin: [null, ''] } },
        ],
    }).lean();

    for (const m of marketsWithResults) {
        const displayResult = computeDisplayResult(m.openingNumber, m.closingNumber);
        await MarketResult.findOneAndUpdate(
            { marketId: m._id, dateKey: yesterdayKey },
            {
                $set: {
                    marketName: m.marketName,
                    openingNumber: m.openingNumber ?? null,
                    closingNumber: m.closingNumber ?? null,
                    displayResult: displayResult || '***-**-***',
                },
            },
            { upsert: true, new: true }
        );
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

/**
 * If we've crossed into a new calendar day (IST), save yesterday's results to history, then clear
 * openingNumber and closingNumber for all markets. View history (result-history by date) is preserved.
 * Called when fetching markets so admin and frontend always see reset results after midnight IST.
 * @param {Model} Market - Mongoose Market model
 */
export async function ensureResultsResetForNewDay(Market) {
    const today = getTodayIST();
    
    console.log(`[resultReset] 🔍 Checking if reset needed for ${today}...`);

    // Get last reset date from database (persists across server restarts)
    const lastResetDate = await getLastResetDateFromDB();
    
    if (lastResetDate === null) {
        console.log(`[resultReset] ⚠️  No previous reset date found in database (first run or database was cleared)`);
    } else {
        console.log(`[resultReset] 📅 Last reset was on: ${lastResetDate}`);
    }

    // If we've already reset today, skip (use < instead of <= to allow same-day resets if needed)
    if (lastResetDate !== null && today <= lastResetDate) {
        console.log(`[resultReset] ✓ Already reset today (${today}), skipping`);
        return;
    }

    // New day (IST) or first run: save yesterday's results to history, then clear all markets
    if (lastResetDate === null) {
        console.log(`[resultReset] 🚀 First-time reset - initializing for ${today}`);
    } else {
        console.log(`[resultReset] ✅ New day detected! Resetting markets from ${lastResetDate} to ${today}`);
    }
    
    // Save yesterday's snapshots to history (only if we have a previous date)
    if (lastResetDate !== null) {
        try {
            await saveYesterdaySnapshotsToHistory(Market);
            console.log(`[resultReset] 💾 Saved yesterday's (${lastResetDate}) results to history`);
        } catch (err) {
            console.error('[resultReset] ❌ Failed to save yesterday snapshots to history:', err.message);
        }
    }

    // Clear all market results (opening/closing numbers, result, winNumber)
    console.log(`[resultReset] 🔄 Clearing all market results...`);
    const result = await Market.updateMany(
        {},
        { $set: { 
            openingNumber: null, 
            closingNumber: null,
            result: null,
            winNumber: null 
        } }
    );
    
    console.log(`[resultReset] ✅ Cleared all result data for ${result.modifiedCount} markets`);
    
    // Save today's date to database so we don't reset again until tomorrow
    await saveLastResetDateToDB(today);
    
    console.log(`[resultReset] ✅ Market reset completed successfully for ${today}`);
    console.log(`[resultReset] 📊 Summary: ${result.modifiedCount} markets reset, history preserved`);
}
