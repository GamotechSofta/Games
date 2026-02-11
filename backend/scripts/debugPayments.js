/**
 * Debug script: Check payment bookieId status and bookie types
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function debug() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const Admin = mongoose.connection.collection('admins');
    const User = mongoose.connection.collection('users');
    const Payment = mongoose.connection.collection('payments');

    // 1. Show all bookies and their type
    console.log('=== ALL BOOKIES ===');
    const bookies = await Admin.find({ role: 'bookie' }).toArray();
    for (const b of bookies) {
        console.log(`  ${b.username} | bookieType: ${b.bookieType || '(NOT SET)'} | _id: ${b._id}`);
    }

    // 2. Show users and their referredBy
    console.log('\n=== USERS WITH referredBy ===');
    const users = await User.find({}).toArray();
    for (const u of users) {
        const refBookie = u.referredBy ? bookies.find(b => b._id.toString() === u.referredBy?.toString()) : null;
        console.log(`  ${u.username} | referredBy: ${u.referredBy || 'NULL'} (${refBookie?.username || 'none'}) | _id: ${u._id}`);
    }

    // 3. Show payments and their bookieId
    console.log('\n=== PAYMENTS ===');
    const payments = await Payment.find({}).sort({ createdAt: -1 }).toArray();
    for (const p of payments) {
        const bookie = p.bookieId ? bookies.find(b => b._id.toString() === p.bookieId?.toString()) : null;
        const user = users.find(u => u._id.toString() === p.userId?.toString());
        console.log(`  ${p._id.toString().slice(-6)} | user: ${user?.username || '?'} | type: ${p.type} | status: ${p.status} | bookieId: ${p.bookieId || 'NULL'} (${bookie?.username || 'none'}, ${bookie?.bookieType || 'N/A'})`);
    }

    // 4. Summary
    const withBookie = payments.filter(p => p.bookieId).length;
    const withoutBookie = payments.filter(p => !p.bookieId).length;
    console.log(`\n=== SUMMARY ===`);
    console.log(`  Total payments: ${payments.length}`);
    console.log(`  With bookieId: ${withBookie}`);
    console.log(`  Without bookieId: ${withoutBookie}`);

    await mongoose.disconnect();
    process.exit(0);
}

debug().catch(e => { console.error(e); process.exit(1); });
