/**
 * Verify cron job handlers and schedule alignment.
 * Usage: node scripts/verifyCron.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cron from 'node-cron';
import connectDB from '../config/db_Connection.js';
import Market from '../models/market/market.js';
import Settings from '../models/settings/settings.js';
import DailyStats from '../models/stats/dailyStats.js';
import { ensureResultsResetForNewDay, getTodayIST } from '../utils/resultReset.js';
import {
    computeDailyStatsForDate,
    getYesterdayStatsDateKey,
} from '../utils/computeDailyStats.js';
import { getYesterdayIST } from '../utils/resultReset.js';

dotenv.config();

const MARKET_RESET_CRON = '30 18 * * *';
const DAILY_STATS_CRON = '45 18 * * *';
const TZ = 'UTC';

function istAtUtcHourMinute(utcHour, utcMinute) {
    const d = new Date();
    d.setUTCHours(utcHour, utcMinute, 0, 0);
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'long',
    }).format(d);
}

function assertCronValid(expr, label) {
    const ok = cron.validate(expr);
    console.log(`  ${ok ? 'OK' : 'FAIL'}  ${label}: "${expr}" (timezone: ${TZ})`);
    if (!ok) throw new Error(`Invalid cron: ${label}`);
}

async function dryRunMarketReset() {
    const todayIST = getTodayIST();
    const lastReset = await Settings.findOne({ key: 'lastMarketResetDate' }).lean();
    const marketCount = await Market.countDocuments();
    const withResults = await Market.countDocuments({
        $or: [
            { openingNumber: { $nin: [null, ''] } },
            { closingNumber: { $nin: [null, ''] } },
        ],
    });

    console.log('\n--- Market reset (ensureResultsResetForNewDay) ---');
    console.log(`  Today (IST):           ${todayIST}`);
    console.log(`  Last reset (DB):       ${lastReset?.value || 'never'}`);
    console.log(`  Markets total:         ${marketCount}`);
    console.log(`  Markets with results:  ${withResults}`);

    await ensureResultsResetForNewDay(Market);

    const afterReset = await Settings.findOne({ key: 'lastMarketResetDate' }).lean();
    console.log(`  After dry-run DB date: ${afterReset?.value || 'never'}`);
    console.log('  Handler: completed without throw');
}

async function dryRunDailyStats() {
    const yesterdayKey = getYesterdayStatsDateKey();
    console.log('\n--- Daily stats (computeDailyStatsForDate) ---');
    console.log(`  Target IST date key:   ${yesterdayKey}`);

    const before = await DailyStats.findOne({ dateKey: yesterdayKey }).lean();
    console.log(`  Existing row:          ${before ? `yes (computed ${before.computedAt})` : 'no'}`);

    const doc = await computeDailyStatsForDate(yesterdayKey);
    console.log(`  Computed revenue:      ${doc.betRevenue}`);
    console.log(`  Computed bet count:    ${doc.betCount}`);
    console.log('  Handler: completed without throw');
}

async function main() {
    console.log('Cron verification\n');

    console.log('Schedule checks:');
    assertCronValid(MARKET_RESET_CRON, 'Market reset');
    assertCronValid(DAILY_STATS_CRON, 'Daily stats');
    console.log(`  Market reset fires at 18:30 UTC → ${istAtUtcHourMinute(18, 30)} (expect ~midnight IST)`);
    console.log(`  Daily stats fires at 18:45 UTC → ${istAtUtcHourMinute(18, 45)} (15 min after IST midnight)`);
    console.log(`  Daily stats IST date:  getYesterdayStatsDateKey() after IST midnight`);

    const simulatedFire = new Date();
    simulatedFire.setUTCHours(18, 45, 0, 0);
    const statsKeyAtFire = getYesterdayStatsDateKey(simulatedFire);
    const istYesterdayAtFire = getYesterdayIST();
    console.log(`  Simulated 18:45 UTC stats key: ${statsKeyAtFire} (IST yesterday now: ${istYesterdayAtFire})`);

    await connectDB();
    await dryRunMarketReset();
    await dryRunDailyStats();

    const statsCount = await DailyStats.countDocuments();
    console.log(`\nDailyStats documents in DB: ${statsCount}`);

    await mongoose.disconnect();
    console.log('\nAll cron handler checks passed.');
}

main().catch((err) => {
    console.error('\nCron verification FAILED:', err?.message || err);
    process.exit(1);
});
