import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Admin from '../models/admin/admin.js';
import connectDB from '../config/db_Connection.js';

dotenv.config();

const PHONE_REGEX = /^[6-9]\d{9}$/;

function normalizePhone(input) {
    return String(input || '').replace(/\D/g, '').slice(-10);
}

const createTelecaller = async () => {
    try {
        await connectDB();

        const phone = normalizePhone(process.argv[2] || '9876543210');
        const password = process.argv[3] || 'telecaller123';

        if (!PHONE_REGEX.test(phone)) {
            console.error('Invalid mobile. Use 10 digits starting with 6–9.');
            process.exit(1);
        }

        const existing = await Admin.findOne({
            $or: [{ username: phone }, { phone }],
        });
        if (existing) {
            console.log(`Mobile ${phone} already exists (role: ${existing.role}).`);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Admin.collection.insertOne({
            username: phone,
            phone,
            password: hashedPassword,
            role: 'telecaller',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        console.log('Telecaller account created.');
        console.log(`Mobile: ${phone}`);
        console.log(`Password: ${password}`);
        console.log('Use the telecaller app (port 5177) to sign in.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createTelecaller();
