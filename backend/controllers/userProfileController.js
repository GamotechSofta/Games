import User from '../models/user/user.js';
import Admin from '../models/admin/admin.js';
import { Wallet } from '../models/wallet/wallet.js';

const buildUserPayload = async (userId) => {
    const user = await User.findById(userId).select('username phone email role referredBy createdAt').lean();
    const wallet = await Wallet.findOne({ userId }).select('balance').lean();

    const data = {
        id: user._id,
        username: user.username || 'Player',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        balance: wallet?.balance ?? 0,
        createdAt: user.createdAt || null,
    };

    if (user.referredBy) {
        data.referredBy = user.referredBy;
        const bookie = await Admin.findById(user.referredBy).select('uiTheme').lean();
        data.bookieTheme = bookie?.uiTheme || { themeId: 'default' };
    }

    return data;
};

export const getMyProfile = async (req, res) => {
    try {
        const payload = await buildUserPayload(req.user._id);
        return res.status(200).json({
            success: true,
            message: 'Profile fetched successfully',
            data: payload,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
