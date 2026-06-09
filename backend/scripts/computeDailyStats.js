/**
 * Compute materialized daily stats for one or more UTC dates.
 *
 * Usage:
 *   node scripts/computeDailyStats.js              # yesterday
 *   node scripts/computeDailyStats.js 2026-06-01   # single day
 *   node scripts/computeDailyStats.js --days=7     # last 7 complete days
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db_Connection.js';
import DailyStats from '../models/stats/dailyStats.js';
import {
    computeDailyStatsForDate,
    getYesterdayStatsDateKey,
    isCompletePastStatsDay,
} from '../utils/computeDailyStats.js';

dotenv.config();

function parseArgs(argv) {
    const daysArg = argv.find((a) => a.startsWith('--days='));
    const days = daysArg ? Number(daysArg.slice(7)) : 0;
    const dateArg = argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
    return { days, dateArg };
}

function dateKeysForLastDays(n, now = new Date()) {
    const keys = [];
    for (let i = 1; i <= n; i += 1) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
}

async function main() {
    const { days, dateArg } = parseArgs(process.argv.slice(2));
    await connectDB();

    const keys = dateArg
        ? [dateArg]
        : days > 0
            ? dateKeysForLastDays(days)
            : [getYesterdayStatsDateKey()];

    for (const dateKey of keys) {
        if (!isCompletePastStatsDay(dateKey)) {
            console.warn(`Skip ${dateKey} — not a complete past IST day`);
            continue;
        }
        const doc = await computeDailyStatsForDate(dateKey);
        console.log(`${dateKey}: revenue=${doc.betRevenue} bets=${doc.betCount} newUsers=${doc.newUsers}`);
    }

    const total = await DailyStats.countDocuments();
    console.log(`\nDailyStats collection: ${total} document(s)`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error('computeDailyStats failed:', err?.message || err);
    process.exit(1);
});
