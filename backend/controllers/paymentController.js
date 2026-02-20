import Payment from '../models/payment/payment.js';
import BankDetail from '../models/bankDetail/bankDetail.js';
import { Wallet } from '../models/wallet/wallet.js';
import Admin from '../models/admin/admin.js';
import User from '../models/user/user.js';
import bcrypt from 'bcryptjs';
import { getBookieUserIds } from '../utils/bookieFilter.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { decrypt } from '../utils/encryption.js';

// ============ CONFIG API ============

/**
 * Get payment configuration (UPI details, limits)
 * Public API - accepts optional ?userId to resolve correct UPI based on bookie type
 */
export const getPaymentConfig = async (req, res) => {
    try {
        const { userId } = req.query;

        // UPI: 1) DB (super_admin/bookie), 2) code fallback (no env)
        const UPI_FALLBACK_ID = 'example@paytm';
        const UPI_FALLBACK_NAME = 'Golden Games';
        let upiIds = [UPI_FALLBACK_ID];
        let upiName = UPI_FALLBACK_NAME;

        const resolveUpiFromAdmin = (admin) => {
            if (!admin) return null;
            if (admin.upiIds && Array.isArray(admin.upiIds) && admin.upiIds.length > 0) {
                return admin.upiIds.map((enc) => (enc ? decrypt(enc) : '')).filter(Boolean);
            }
            if (admin.upiId) {
                const d = decrypt(admin.upiId);
                return d ? [d] : [];
            }
            return [];
        };

        const applyDistribution = (ids, type, batchSize, uid, userDoc, bookieId) => {
            if (!ids || ids.length === 0) return ids;
            if (ids.length === 1) return ids;
            const t = type || 'all';
            if (t === 'all') return ids;

            if (t === 'random') {
                const idx = Math.floor(Math.random() * ids.length);
                return [ids[idx]];
            }

            if (t === 'round_robin_user' && uid) {
                let h = 0;
                const str = String(uid);
                for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
                const idx = Math.abs(h) % ids.length;
                return [ids[idx]];
            }

            if (t === 'batch_n' && userDoc && batchSize > 0) {
                const filter = bookieId
                    ? { referredBy: bookieId, createdAt: { $lt: userDoc.createdAt } }
                    : { createdAt: { $lt: userDoc.createdAt } };
                return User.countDocuments(filter).then((count) => {
                    const batchIndex = Math.floor(count / batchSize);
                    const idx = batchIndex % ids.length;
                    return [ids[idx]];
                });
            }

            return ids;
        };

        let sourceAdmin = null;
        let bookieIdForScope = null;

        try {
            if (userId) {
                const user = await User.findById(userId).select('referredBy createdAt').lean();
                if (user?.referredBy) {
                    const bookie = await Admin.findById(user.referredBy).select('bookieType upiId upiIds upiDistributionType upiBatchSize username').lean();
                    if (bookie?.bookieType === 'bookie_collects') {
                        const ids = resolveUpiFromAdmin(bookie);
                        if (ids.length > 0) {
                            upiIds = ids;
                            upiName = bookie.username || 'Bookie';
                            sourceAdmin = bookie;
                            bookieIdForScope = user.referredBy?.toString?.() || user.referredBy;
                        }
                    } else {
                        const superAdmin = await Admin.findOne({ role: 'super_admin', $or: [{ upiId: { $ne: '' } }, { 'upiIds.0': { $exists: true } }] }).select('upiId upiIds upiDistributionType upiBatchSize username').lean();
                        const ids = resolveUpiFromAdmin(superAdmin);
                        if (ids.length > 0) {
                            upiIds = ids;
                            upiName = superAdmin.username || upiName;
                            sourceAdmin = superAdmin;
                        }
                    }
                } else {
                    const superAdmin = await Admin.findOne({ role: 'super_admin', $or: [{ upiId: { $ne: '' } }, { 'upiIds.0': { $exists: true } }] }).select('upiId upiIds upiDistributionType upiBatchSize username').lean();
                    const ids = resolveUpiFromAdmin(superAdmin);
                    if (ids.length > 0) {
                        upiIds = ids;
                        upiName = superAdmin.username || upiName;
                        sourceAdmin = superAdmin;
                    }
                }

                if (sourceAdmin && upiIds.length > 1) {
                    const distributed = await applyDistribution(
                        upiIds,
                        sourceAdmin.upiDistributionType,
                        sourceAdmin.upiBatchSize ?? 10,
                        userId,
                        user,
                        bookieIdForScope
                    );
                    upiIds = Array.isArray(distributed) ? distributed : upiIds;
                }
            } else {
                const superAdmin = await Admin.findOne({ role: 'super_admin', $or: [{ upiId: { $ne: '' } }, { 'upiIds.0': { $exists: true } }] }).select('upiId upiIds upiDistributionType upiBatchSize username').lean();
                const ids = resolveUpiFromAdmin(superAdmin);
                if (ids.length > 0) {
                    upiIds = ids;
                    upiName = superAdmin.username || upiName;
                }
            }
        } catch (err) {
            console.error('Error resolving UPI for user:', userId, err.message);
        }

        res.status(200).json({
            success: true,
            data: {
                upiId: upiIds[0] || UPI_FALLBACK_ID,
                upiIds,
                upiName,
                minDeposit: parseInt(process.env.MIN_DEPOSIT) || 100,
                maxDeposit: parseInt(process.env.MAX_DEPOSIT) || 50000,
                minWithdrawal: parseInt(process.env.MIN_WITHDRAWAL) || 500,
                maxWithdrawal: parseInt(process.env.MAX_WITHDRAWAL) || 25000,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ USER APIs ============

/**
 * User: Create deposit request with screenshot
 */
export const createDepositRequest = async (req, res) => {
    try {
        const { amount, upiTransactionId, userNote } = req.body;
        const userId = req.body.userId;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const minDeposit = parseInt(process.env.MIN_DEPOSIT) || 100;
        const maxDeposit = parseInt(process.env.MAX_DEPOSIT) || 50000;

        if (!amount || amount < minDeposit || amount > maxDeposit) {
            return res.status(400).json({
                success: false,
                message: `Amount must be between ₹${minDeposit} and ₹${maxDeposit}`,
            });
        }

        // Upload screenshot to Cloudinary if provided
        let screenshotUrl = null;
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, 'payments');
                screenshotUrl = result.secure_url;
            } catch (uploadError) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload screenshot. Please try again.',
                });
            }
        }

        // Auto-resolve bookieId from user's referredBy
        let bookieId = null;
        try {
            const userDoc = await User.findById(userId).select('referredBy').lean();
            if (userDoc?.referredBy) {
                bookieId = userDoc.referredBy;
            }
        } catch (err) {
            console.error('Failed to resolve bookieId for deposit:', err.message);
        }

        const payment = await Payment.create({
            userId,
            bookieId,
            type: 'deposit',
            amount,
            method: 'upi',
            status: 'pending',
            screenshotUrl,
            upiTransactionId: upiTransactionId || '',
            userNote: userNote || '',
        });

        await logActivity({
            action: 'deposit_request_created',
            performedBy: userId,
            performedByType: 'user',
            targetType: 'payment',
            targetId: payment._id.toString(),
            details: `Deposit request ₹${amount} created`,
            ip: getClientIp(req),
        });

        res.status(201).json({
            success: true,
            message: 'Deposit request submitted successfully. Please wait for admin approval.',
            data: payment,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Create withdrawal request
 */
export const createWithdrawalRequest = async (req, res) => {
    try {
        const { amount, bankDetailId, userNote, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const minWithdrawal = parseInt(process.env.MIN_WITHDRAWAL) || 500;
        const maxWithdrawal = parseInt(process.env.MAX_WITHDRAWAL) || 25000;

        if (!amount || amount < minWithdrawal || amount > maxWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Amount must be between ₹${minWithdrawal} and ₹${maxWithdrawal}`,
            });
        }

        // Check wallet balance
        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance',
            });
        }

        // Validate bank detail if provided
        if (bankDetailId) {
            const bankDetail = await BankDetail.findOne({ _id: bankDetailId, userId, isActive: true });
            if (!bankDetail) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid bank account selected',
                });
            }
        }

        // Check for pending withdrawal
        const pendingWithdrawal = await Payment.findOne({
            userId,
            type: 'withdrawal',
            status: 'pending',
        });

        if (pendingWithdrawal) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending withdrawal request. Please wait for it to be processed.',
            });
        }

        // Auto-resolve bookieId from user's referredBy
        let bookieId = null;
        try {
            const userDoc = await User.findById(userId).select('referredBy').lean();
            if (userDoc?.referredBy) {
                bookieId = userDoc.referredBy;
            }
        } catch (err) {
            console.error('Failed to resolve bookieId for withdrawal:', err.message);
        }

        const payment = await Payment.create({
            userId,
            bookieId,
            type: 'withdrawal',
            amount,
            method: 'bank_transfer',
            status: 'pending',
            bankDetailId: bankDetailId || null,
            userNote: userNote || '',
        });

        await logActivity({
            action: 'withdrawal_request_created',
            performedBy: userId,
            performedByType: 'user',
            targetType: 'payment',
            targetId: payment._id.toString(),
            details: `Withdrawal request ₹${amount} created`,
            ip: getClientIp(req),
        });

        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted successfully. Please wait for admin approval.',
            data: payment,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Get my deposit history
 */
export const getMyDeposits = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const deposits = await Payment.find({ userId, type: 'deposit' })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.status(200).json({ success: true, data: deposits });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Get my withdrawal history
 */
export const getMyWithdrawals = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const withdrawals = await Payment.find({ userId, type: 'withdrawal' })
            .populate('bankDetailId', 'accountHolderName bankName accountNumber upiId ifscCode')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.status(200).json({ success: true, data: withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ ADMIN APIs ============

/**
 * Admin/Bookie: Get all payments with filters
 * - Bookie: sees only their users' payments
 * - Admin: sees ALL payments (including bookie_collects) but can only manage admin_collects + direct
 */
export const getPayments = async (req, res) => {
    try {
        const { status, type, bookieId: filterBookieId } = req.query;
        const query = {};

        if (req.admin?.role === 'bookie') {
            // Bookie: show payments from their users (bookieId match OR userId match for old payments)
            const bookieUserIds = await getBookieUserIds(req.admin);
            if (bookieUserIds !== null && bookieUserIds.length > 0) {
                query.$or = [
                    { bookieId: req.admin._id },
                    { userId: { $in: bookieUserIds } },
                ];
            } else {
                query.bookieId = req.admin._id;
            }
        } else if (req.admin?.role === 'super_admin' && filterBookieId) {
            // Admin filtering by specific bookie
            query.bookieId = filterBookieId === 'direct' ? null : filterBookieId;
        }
        // Admin without filter: no bookieId restriction → sees ALL payments

        if (status) query.status = status;
        if (type) query.type = type;

        const payments = await Payment.find(query)
            .populate('userId', 'username email phone')
            .populate('bookieId', 'username bookieType')
            .populate('bankDetailId', 'accountHolderName bankName accountNumber upiId ifscCode')
            .populate('processedBy', 'username role')
            .sort({ createdAt: -1 })
            .limit(1000);

        res.status(200).json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin/Bookie: Get pending payments count
 * Same separation: bookie sees their users, admin sees only admin-managed payments
 */
export const getPendingCount = async (req, res) => {
    try {
        const query = { status: 'pending' };
        
        if (req.admin?.role === 'bookie') {
            // Bookie: count payments for their users
            const bookieUserIds = await getBookieUserIds(req.admin);
            if (bookieUserIds !== null && bookieUserIds.length > 0) {
                query.$or = [
                    { bookieId: req.admin._id },
                    { userId: { $in: bookieUserIds } },
                ];
            } else {
                query.bookieId = req.admin._id;
            }
        } else if (req.admin?.role === 'super_admin') {
            // Admin: only count payments that admin manages (exclude bookie_collects)
            const bookieCollectsBookies = await Admin.find({ role: 'bookie', bookieType: 'bookie_collects' }).select('_id').lean();
            const excludeBookieIds = bookieCollectsBookies.map(b => b._id);
            if (excludeBookieIds.length > 0) {
                query.bookieId = { $nin: excludeBookieIds };
            }
        }

        const depositCount = await Payment.countDocuments({ ...query, type: 'deposit' });
        const withdrawalCount = await Payment.countDocuments({ ...query, type: 'withdrawal' });

        res.status(200).json({
            success: true,
            data: {
                deposits: depositCount,
                withdrawals: withdrawalCount,
                total: depositCount + withdrawalCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin/Bookie: Approve payment
 * Bookies can only approve if their bookieType is 'bookie_collects' and payment belongs to their users
 * Body: { adminRemarks?: string, secretDeclarePassword?: string } – secret required if admin has it set
 */
export const approvePayment = async (req, res) => {
    try {
        // Secret password check (only for super_admin)
        if (req.admin?.role === 'super_admin') {
            const adminWithSecret = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
            if (adminWithSecret?.secretDeclarePassword) {
                const provided = (req.body.secretDeclarePassword ?? '').toString().trim();
                const isValid = await bcrypt.compare(provided, adminWithSecret.secretDeclarePassword);
                if (!isValid) {
                    return res.status(403).json({
                        success: false,
                        message: 'Invalid secret declare password',
                        code: 'INVALID_SECRET_DECLARE_PASSWORD',
                    });
                }
            }
        }

        // Bookie permission check
        if (req.admin?.role === 'bookie') {
            const bookieDoc = await Admin.findById(req.admin._id).select('bookieType').lean();
            if (bookieDoc?.bookieType !== 'bookie_collects') {
                return res.status(403).json({ success: false, message: 'Only "Bookie Collects" type bookies can manage payments' });
            }
        }

        const { id } = req.params;
        const { adminRemarks } = req.body;

        const payment = await Payment.findById(id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Admin cannot approve bookie_collects payments – only the bookie manages those
        if (req.admin?.role === 'super_admin' && payment.bookieId) {
            const paymentBookie = await Admin.findById(payment.bookieId).select('bookieType').lean();
            if (paymentBookie?.bookieType === 'bookie_collects') {
                return res.status(403).json({ success: false, message: 'This payment is managed by the bookie, not admin' });
            }
        }

        // Bookie can only approve their own users' payments
        if (req.admin?.role === 'bookie') {
            const bookieUserIds = await getBookieUserIds(req.admin);
            const paymentUserId = payment.userId?._id?.toString() || payment.userId?.toString();
            if (bookieUserIds !== null && !bookieUserIds.some(uid => uid.toString() === paymentUserId)) {
                return res.status(403).json({ success: false, message: 'This payment does not belong to your users' });
            }
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Payment is not pending' });
        }

        // For withdrawals, check balance again
        if (payment.type === 'withdrawal') {
            const wallet = await Wallet.findOne({ userId: payment.userId._id });
            if (!wallet || wallet.balance < payment.amount) {
                return res.status(400).json({
                    success: false,
                    message: 'User has insufficient balance for this withdrawal',
                });
            }
        }

        // Update payment status
        payment.status = 'approved';
        payment.adminRemarks = adminRemarks || 'Approved';
        payment.processedBy = req.admin._id;
        payment.processedByType = req.admin?.role === 'bookie' ? 'bookie' : 'admin';
        payment.processedAt = new Date();
        await payment.save();

        // Update wallet
        let wallet = await Wallet.findOne({ userId: payment.userId._id });
        if (!wallet) {
            wallet = new Wallet({ userId: payment.userId._id, balance: 0 });
        }

        if (payment.type === 'deposit') {
            wallet.balance += payment.amount;
        } else if (payment.type === 'withdrawal') {
            wallet.balance -= payment.amount;
        }
        await wallet.save();

        await logActivity({
            action: `payment_${payment.type}_approved`,
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'payment',
            targetId: id,
            details: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} ₹${payment.amount} approved for "${payment.userId?.username}"`,
            meta: { paymentId: id, type: payment.type, amount: payment.amount },
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} approved successfully`,
            data: payment,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin/Bookie: Reject payment
 */
export const rejectPayment = async (req, res) => {
    try {
        // Bookie permission check
        if (req.admin?.role === 'bookie') {
            const bookieDoc = await Admin.findById(req.admin._id).select('bookieType').lean();
            if (bookieDoc?.bookieType !== 'bookie_collects') {
                return res.status(403).json({ success: false, message: 'Only "Bookie Collects" type bookies can manage payments' });
            }
        }

        const { id } = req.params;
        const { adminRemarks } = req.body;

        const payment = await Payment.findById(id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Admin cannot reject bookie_collects payments – only the bookie manages those
        if (req.admin?.role === 'super_admin' && payment.bookieId) {
            const paymentBookie = await Admin.findById(payment.bookieId).select('bookieType').lean();
            if (paymentBookie?.bookieType === 'bookie_collects') {
                return res.status(403).json({ success: false, message: 'This payment is managed by the bookie, not admin' });
            }
        }

        // Bookie can only reject their own users' payments
        if (req.admin?.role === 'bookie') {
            const bookieUserIds = await getBookieUserIds(req.admin);
            const paymentUserId = payment.userId?._id?.toString() || payment.userId?.toString();
            if (bookieUserIds !== null && !bookieUserIds.some(uid => uid.toString() === paymentUserId)) {
                return res.status(403).json({ success: false, message: 'This payment does not belong to your users' });
            }
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Payment is not pending' });
        }

        payment.status = 'rejected';
        payment.adminRemarks = adminRemarks || 'Rejected';
        payment.processedBy = req.admin._id;
        payment.processedByType = req.admin?.role === 'bookie' ? 'bookie' : 'admin';
        payment.processedAt = new Date();
        await payment.save();

        await logActivity({
            action: `payment_${payment.type}_rejected`,
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'payment',
            targetId: id,
            details: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} ₹${payment.amount} rejected for "${payment.userId?.username}"`,
            meta: { paymentId: id, type: payment.type, amount: payment.amount, reason: adminRemarks },
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected`,
            data: payment,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Legacy: Update payment status (kept for backward compatibility)
 */
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminRemarks } = req.body;

        if (status === 'approved') {
            req.body.adminRemarks = adminRemarks;
            return approvePayment(req, res);
        } else if (status === 'rejected') {
            req.body.adminRemarks = adminRemarks;
            return rejectPayment(req, res);
        }

        const payment = await Payment.findById(id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        payment.status = status;
        if (adminRemarks) payment.adminRemarks = adminRemarks;
        payment.processedBy = req.admin._id;
        payment.processedAt = new Date();
        await payment.save();

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
