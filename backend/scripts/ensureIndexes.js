/**
 * Sync MongoDB indexes from Mongoose schemas.
 * Run after deploy when autoIndex is disabled in production.
 *
 * Usage:
 *   node scripts/ensureIndexes.js
 *   node scripts/ensureIndexes.js --dry-run
 *   node scripts/ensureIndexes.js --verify-only
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db_Connection.js';

import User from '../models/user/user.js';
import Bet from '../models/bet/bet.js';
import Payment from '../models/payment/payment.js';
import Market from '../models/market/market.js';
import Admin from '../models/admin/admin.js';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import HelpDesk from '../models/helpDesk/helpDesk.js';
import ActivityLog from '../models/activityLog/activityLog.js';
import DailySettlement from '../models/settlement/dailySettlement.js';
import CommissionRequest from '../models/commission/commission.js';
import BankDetail from '../models/bankDetail/bankDetail.js';
import MarketResult from '../models/marketResult/marketResult.js';
import PushSubscription from '../models/push/pushSubscription.js';
import StarlineGroup from '../models/starlineGroup/starlineGroup.js';
import KingBazaarGroup from '../models/kingBazaarGroup/kingBazaarGroup.js';
import Settings from '../models/settings/settings.js';
import Rate from '../models/rate/rate.js';
import Game from '../models/game.model.js';
import GameSession from '../models/gameSession.model.js';
import GapWalletTransaction from '../models/gapWalletTransaction.model.js';
import DailyStats from '../models/stats/dailyStats.js';

dotenv.config();

const MODELS = [
    User,
    Bet,
    Payment,
    Market,
    Admin,
    Wallet,
    WalletTransaction,
    HelpDesk,
    ActivityLog,
    DailySettlement,
    CommissionRequest,
    BankDetail,
    MarketResult,
    PushSubscription,
    StarlineGroup,
    KingBazaarGroup,
    Settings,
    Rate,
    Game,
    GameSession,
    GapWalletTransaction,
    DailyStats,
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verifyOnly = args.has('--verify-only');

function formatIndex(index) {
    const flags = [];
    if (index.unique) flags.push('unique');
    if (index.sparse) flags.push('sparse');
    const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
    return `${index.name}${flagStr}`;
}

async function listIndexes(model) {
    const indexes = await model.collection.indexes();
    return indexes.map(formatIndex);
}

async function main() {
    await connectDB();

    console.log(`MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    console.log(`Mode: ${verifyOnly ? 'verify-only' : dryRun ? 'dry-run' : 'sync'}\n`);

    let totalCreated = 0;
    let totalDropped = 0;

    for (const model of MODELS) {
        const name = model.modelName;
        const before = await listIndexes(model);

        if (verifyOnly || dryRun) {
            console.log(`${name} (${before.length} indexes)`);
            for (const idx of before) console.log(`  - ${idx}`);
            console.log('');
            continue;
        }

        const diff = await model.syncIndexes();
        const created = diff.filter((d) => d.startsWith('create')).length;
        const dropped = diff.filter((d) => d.startsWith('drop')).length;
        totalCreated += created;
        totalDropped += dropped;

        const after = await listIndexes(model);
        console.log(`${name}: ${after.length} indexes (${created} created, ${dropped} dropped)`);
        for (const idx of after) console.log(`  - ${idx}`);
        if (diff.length > 0) console.log(`  changes: ${diff.join(', ')}`);
        console.log('');
    }

    if (!verifyOnly && !dryRun) {
        console.log(`Done. ${totalCreated} index(es) created, ${totalDropped} dropped.`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error('ensureIndexes failed:', err?.message || err);
    process.exit(1);
});
