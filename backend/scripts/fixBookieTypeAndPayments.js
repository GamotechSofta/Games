/**
 * Fix: 
 * 1. Set bookieType='admin_collects' on bookies that don't have it stored
 * 2. Backfill bookieId on payments from user's referredBy
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function fix() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const Admin = mongoose.connection.collection('admins');
    const User = mongoose.connection.collection('users');
    const Payment = mongoose.connection.collection('payments');

    // Step 1: Fix bookies missing bookieType
    console.log('=== Step 1: Fix bookies missing bookieType ===');
    const result1 = await Admin.updateMany(
        { role: 'bookie', bookieType: { $exists: false } },
        { $set: { bookieType: 'admin_collects' } }
    );
    console.log(`  Updated ${result1.modifiedCount} bookies with bookieType='admin_collects'\n`);

    // Also fix bookies where bookieType is null or empty string
    const result1b = await Admin.updateMany(
        { role: 'bookie', $or: [{ bookieType: null }, { bookieType: '' }] },
        { $set: { bookieType: 'admin_collects' } }
    );
    console.log(`  Updated ${result1b.modifiedCount} more bookies (null/empty bookieType)\n`);

    // Step 2: Backfill bookieId on payments
    console.log('=== Step 2: Backfill bookieId on payments ===');
    const paymentsWithoutBookie = await Payment.find({
        $or: [{ bookieId: null }, { bookieId: { $exists: false } }],
    }).toArray();

    console.log(`  Found ${paymentsWithoutBookie.length} payments without bookieId`);

    let updated = 0;
    let skipped = 0;

    for (const payment of paymentsWithoutBookie) {
        if (!payment.userId) { skipped++; continue; }

        const user = await User.findOne({ _id: payment.userId });
        if (user?.referredBy) {
            await Payment.updateOne(
                { _id: payment._id },
                { $set: { bookieId: user.referredBy } }
            );
            updated++;
        } else {
            skipped++;
        }
    }

    console.log(`  Updated: ${updated}, Skipped: ${skipped} (no referredBy)\n`);

    // Verify
    console.log('=== Verification ===');
    const bookies = await Admin.find({ role: 'bookie' }).toArray();
    for (const b of bookies) {
        console.log(`  ${b.username} | bookieType: ${b.bookieType}`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
