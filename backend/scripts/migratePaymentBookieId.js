/**
 * Migration: Backfill bookieId on existing Payment documents
 * 
 * For payments that don't have bookieId set, looks up the user's referredBy field
 * and sets it as the bookieId on the payment.
 * 
 * Usage: node --experimental-modules scripts/migratePaymentBookieId.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function migrate() {
    if (!MONGO_URI) {
        console.error('No MONGO_URI found in .env');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const Payment = mongoose.connection.collection('payments');
    const User = mongoose.connection.collection('users');

    // Find all payments where bookieId is null or doesn't exist
    const paymentsWithoutBookie = await Payment.find({
        $or: [
            { bookieId: null },
            { bookieId: { $exists: false } },
        ],
    }).toArray();

    console.log(`Found ${paymentsWithoutBookie.length} payments without bookieId`);

    let updated = 0;
    let skipped = 0;

    for (const payment of paymentsWithoutBookie) {
        if (!payment.userId) {
            skipped++;
            continue;
        }

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

    console.log(`Migration complete: ${updated} updated, ${skipped} skipped (no referredBy)`);
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
