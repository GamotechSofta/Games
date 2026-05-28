import jwt from 'jsonwebtoken';
import User from '../models/user/user.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export const verifyUserAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authorization token is required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'user') {
            return res.status(401).json({ success: false, message: 'Invalid user token' });
        }

        const user = await User.findById(decoded.id).select('username phone email role isActive referredBy createdAt').lean();
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
