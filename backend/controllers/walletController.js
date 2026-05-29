import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import User from '../models/user/user.js';
import Bet from '../models/bet/bet.js';
import Admin from '../models/admin/admin.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { notifyPlayerWalletBalance } from '../utils/playerWalletNotify.js';
import { toClientWalletTransaction } from '../utils/paymentDisplay.js';

export const getAllWallets = async (req, res) => {
    try {
        const query = {};
        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
        }
        const wallets = await Wallet.find(query)
            .populate('userId', 'username email referredBy')
            .sort({ balance: -1 })
            .lean();

        // For admin view: enrich each wallet with the user's bookie type
        if (req.admin?.role === 'super_admin') {
            const enriched = [];
            // Collect unique bookie IDs
            const bookieIds = [...new Set(wallets.filter(w => w.userId?.referredBy).map(w => String(w.userId.referredBy)))];
            const bookieMap = {};
            if (bookieIds.length > 0) {
                const bookieDocs = await Admin.find({ _id: { $in: bookieIds } }).select('_id username bookieType').lean();
                for (const b of bookieDocs) {
                    bookieMap[String(b._id)] = b;
                }
            }
            for (const w of wallets) {
                const obj = { ...w };
                if (w.userId?.referredBy) {
                    const bookie = bookieMap[String(w.userId.referredBy)];
                    obj.userBookieType = bookie?.bookieType || 'admin_collects';
                    obj.userBookieName = bookie?.username || '';
                } else {
                    obj.userBookieType = 'direct';
                    obj.userBookieName = '';
                }
                enriched.push(obj);
            }
            res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
            return res.status(200).json({ success: true, data: enriched });
        }

        res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        res.status(200).json({ success: true, data: wallets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTransactions = async (req, res) => {
    try {
        const { userId } = req.query;
        const query = {};
        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
        }
        if (userId) {
            query.userId = userId;
        }
        const transactions = await WalletTransaction.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        res.status(200).json({
            success: true,
            data: transactions.map((t) => toClientWalletTransaction(t)),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User-facing: get wallet transactions for a userId (no auth token in this project).
 * Query/body: { userId, limit? }.
 * Returns latest transactions (most recent first).
 */
export const getMyTransactions = async (req, res) => {
    try {
        const userId = req.body?.userId || req.query?.userId;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }
        const limitRaw = req.query?.limit ?? req.body?.limit;
        let limit = Number(limitRaw);
        if (!Number.isFinite(limit) || limit <= 0) limit = 200;
        limit = Math.min(limit, 1000);

        const includeBetRaw = req.query?.includeBet ?? req.body?.includeBet;
        const includeBet = ['1', 'true', 'yes', 'y'].includes(String(includeBetRaw || '').toLowerCase());

        const transactions = await WalletTransaction.find({ userId })
            .select('type amount description referenceId createdAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const sanitizeList = (list) => (list || []).map((t) => toClientWalletTransaction(t));

        if (!includeBet || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(200).json({ success: true, data: sanitizeList(transactions) });
        }

        const isObjectIdLike = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v.trim());
        const refIds = Array.from(
            new Set(transactions.map((t) => String(t?.referenceId || '').trim()).filter(isObjectIdLike))
        );

        if (refIds.length === 0) {
            return res.status(200).json({ success: true, data: sanitizeList(transactions) });
        }

        const bets = await Bet.find({ _id: { $in: refIds }, userId })
            .populate('marketId', 'marketName')
            .select('betType betNumber marketId')
            .lean();

        const betMap = new Map((bets || []).map((b) => [String(b._id), b]));
        const enriched = transactions.map((t) => {
            const ref = String(t?.referenceId || '').trim();
            const b = betMap.get(ref);
            if (!b) return t;
            return {
                ...t,
                bet: {
                    betType: b?.betType,
                    betNumber: b?.betNumber,
                    marketId: b?.marketId?._id || b?.marketId,
                    marketName: b?.marketId?.marketName || '',
                },
            };
        });

        return res.status(200).json({ success: true, data: sanitizeList(enriched) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adjustBalance = async (req, res) => {
    try {
        const { userId, amount, type } = req.body;

        if (!userId || amount == null || amount === '' || !type) {
            return res.status(400).json({
                success: false,
                message: 'userId, amount and type are required',
            });
        }

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }

        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null && !bookieUserIds.some((id) => String(id) === String(userId))) {
            return res.status(403).json({
                success: false,
                message: 'You can only adjust wallet for your assigned players',
            });
        }

        // Admin cannot adjust wallet for bookie_collects bookie's users
        if (req.admin?.role === 'super_admin') {
            const targetUser = await User.findById(userId).select('referredBy').lean();
            if (targetUser?.referredBy) {
                const userBookie = await Admin.findById(targetUser.referredBy).select('bookieType').lean();
                if (userBookie?.bookieType === 'bookie_collects') {
                    return res.status(403).json({
                        success: false,
                        message: 'This user belongs to a Bookie Collects bookie. Only the bookie can manage their wallet.',
                    });
                }
            }
        }

        // Bookie can only adjust if they are bookie_collects type; require security password if set
        if (req.admin?.role === 'bookie') {
            const selfBookie = await Admin.findById(req.admin._id).select('bookieType securityPassword').select('+securityPassword');
            if (!selfBookie || selfBookie.bookieType !== 'bookie_collects') {
                return res.status(403).json({
                    success: false,
                    message: 'Only Bookie Collects type bookies can adjust user wallets. Admin manages wallets for your users.',
                });
            }
            if (selfBookie.securityPassword) {
                const securityPassword = (req.body.securityPassword || '').trim();
                if (!securityPassword) {
                    return res.status(403).json({
                        success: false,
                        message: 'Security password is required for this action',
                        code: 'SECURITY_PASSWORD_REQUIRED',
                    });
                }
                const valid = await selfBookie.compareSecurityPassword(securityPassword);
                if (!valid) {
                    return res.status(403).json({
                        success: false,
                        message: 'Invalid security password',
                        code: 'SECURITY_PASSWORD_INVALID',
                    });
                }
            }
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        if (type === 'credit') {
            wallet.balance += numAmount;
        } else if (type === 'debit') {
            if (wallet.balance < numAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance',
                });
            }
            wallet.balance -= numAmount;
        } else {
            return res.status(400).json({
                success: false,
                message: 'type must be credit or debit',
            });
        }

        await wallet.save();

        const adjustedBy = req.admin?.role === 'bookie' ? 'Bookie' : 'Admin';
        await WalletTransaction.create({
            userId,
            type,
            amount: numAmount,
            description: `${adjustedBy} ${type}: ₹${numAmount}`,
        });

        const player = await User.findById(userId).select('username').lean();
        if (req.admin) {
            await logActivity({
                action: 'wallet_adjust',
                performedBy: req.admin.username,
                performedByType: req.admin.role || 'admin',
                targetType: 'wallet',
                targetId: String(userId),
                details: `Wallet ${type} ₹${numAmount} for player "${player?.username || userId}"`,
                meta: { userId, amount: numAmount, type },
                ip: getClientIp(req),
            });
        }

        notifyPlayerWalletBalance(userId, 'wallet_adjust').catch(() => {});

        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: set a user's wallet balance to an exact value.
 * Body: { userId, balance } (balance >= 0)
 */
export const setBalance = async (req, res) => {
    try {
        const { userId, balance } = req.body;

        if (!userId || balance == null || balance === '') {
            return res.status(400).json({
                success: false,
                message: 'userId and balance are required',
            });
        }

        const newBalance = Number(balance);
        if (!Number.isFinite(newBalance) || newBalance < 0) {
            return res.status(400).json({
                success: false,
                message: 'Balance must be a non-negative number',
            });
        }

        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null && !bookieUserIds.some((id) => String(id) === String(userId))) {
            return res.status(403).json({
                success: false,
                message: 'You can only set wallet for your assigned players',
            });
        }

        // Admin cannot set wallet for bookie_collects bookie's users
        if (req.admin?.role === 'super_admin') {
            const targetUser = await User.findById(userId).select('referredBy').lean();
            if (targetUser?.referredBy) {
                const userBookie = await Admin.findById(targetUser.referredBy).select('bookieType').lean();
                if (userBookie?.bookieType === 'bookie_collects') {
                    return res.status(403).json({
                        success: false,
                        message: 'This user belongs to a Bookie Collects bookie. Only the bookie can manage their wallet.',
                    });
                }
            }
        }

        // Bookie can only set if they are bookie_collects type
        if (req.admin?.role === 'bookie') {
            const selfBookie = await Admin.findById(req.admin._id).select('bookieType').lean();
            if (!selfBookie || selfBookie.bookieType !== 'bookie_collects') {
                return res.status(403).json({
                    success: false,
                    message: 'Only Bookie Collects type bookies can set user wallets.',
                });
            }
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        const previousBalance = wallet.balance;
        wallet.balance = newBalance;
        await wallet.save();

        const diff = newBalance - previousBalance;
        const type = diff >= 0 ? 'credit' : 'debit';
        const adjustedBy = req.admin?.role === 'bookie' ? 'Bookie' : 'Admin';
        await WalletTransaction.create({
            userId,
            type,
            amount: Math.abs(diff),
            description: `${adjustedBy} set balance to ₹${newBalance} (was ₹${previousBalance})`,
        });

        const player = await User.findById(userId).select('username').lean();
        if (req.admin) {
            await logActivity({
                action: 'wallet_set_balance',
                performedBy: req.admin.username,
                performedByType: req.admin.role || 'admin',
                targetType: 'wallet',
                targetId: String(userId),
                details: `Wallet set to ₹${newBalance} for player "${player?.username || userId}"`,
                meta: { userId, balance: newBalance, previousBalance },
                ip: getClientIp(req),
            });
        }

        notifyPlayerWalletBalance(userId, 'wallet_set').catch(() => {});

        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User-facing: get current wallet balance by userId (for refresh).
 * Body or query: { userId }
 */
export const getBalance = async (req, res) => {
    try {
        const userId = req.body?.userId || req.query?.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required',
            });
        }

        let wallet = await Wallet.findOne({ userId }).lean();
        if (!wallet) {
            wallet = { balance: 0 };
        }
        const balance = wallet.balance ?? 0;
        res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        res.status(200).json({ success: true, data: { balance } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
