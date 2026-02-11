import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { decrypt } from '../utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function check() {
    await mongoose.connect(MONGO_URI);
    const Admin = mongoose.connection.collection('admins');
    const bookies = await Admin.find({ role: 'bookie' }).toArray();
    
    console.log('=== BOOKIE UPI STATUS ===');
    for (const b of bookies) {
        let upi = '(empty)';
        if (b.upiId && b.upiId.length > 0) {
            try { upi = decrypt(b.upiId); } catch { upi = '(decrypt error: ' + b.upiId.substring(0, 30) + '...)'; }
        }
        console.log(`  ${b.username} | type: ${b.bookieType} | upiId: ${upi}`);
    }

    // Also check super admin UPI
    const admins = await Admin.find({ role: 'super_admin' }).toArray();
    console.log('\n=== ADMIN UPI STATUS ===');
    for (const a of admins) {
        let upi = '(empty)';
        if (a.upiId && a.upiId.length > 0) {
            try { upi = decrypt(a.upiId); } catch { upi = '(decrypt error)'; }
        }
        console.log(`  ${a.username} | upiId: ${upi}`);
    }

    await mongoose.disconnect();
    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
