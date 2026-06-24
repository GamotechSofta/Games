import { WalletTransaction } from '../models/wallet/wallet.js';
import Payment from '../models/payment/payment.js';

/** Admin/Bookie manual wallet top-ups (adjust credit or set-balance increase). */
export const MANUAL_WALLET_DEPOSIT_MATCH = {
    type: 'credit',
    $or: [
        { description: { $regex: /^(Admin|Bookie) credit:/ } },
        { description: { $regex: /^(Admin|Bookie) set balance/ } },
    ],
};

/** Admin/Bookie manual wallet deductions (adjust debit or set-balance decrease). */
export const MANUAL_WALLET_WITHDRAWAL_MATCH = {
    type: 'debit',
    $or: [
        { description: { $regex: /^(Admin|Bookie) debit:/ } },
        { description: { $regex: /^(Admin|Bookie) set balance/ } },
    ],
};

function buildWalletTxnMatch(userFilter, dateMatch) {
    const match = { ...dateMatch };
    if (userFilter?.userId) {
        match.userId = userFilter.userId;
    }
    return match;
}

export async function sumManualWalletDeposits(userFilter = {}, dateMatch = {}) {
    const [row] = await WalletTransaction.aggregate([
        { $match: { ...MANUAL_WALLET_DEPOSIT_MATCH, ...buildWalletTxnMatch(userFilter, dateMatch) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return row?.total ?? 0;
}

export async function sumManualWalletWithdrawals(userFilter = {}, dateMatch = {}) {
    const [row] = await WalletTransaction.aggregate([
        { $match: { ...MANUAL_WALLET_WITHDRAWAL_MATCH, ...buildWalletTxnMatch(userFilter, dateMatch) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return row?.total ?? 0;
}

function buildFundsHistoryPaymentQuery(kind, paymentFilter, dateMatch) {
    return {
        type: kind === 'deposit' ? 'deposit' : 'withdrawal',
        status: { $in: ['approved', 'completed'] },
        ...dateMatch,
        ...paymentFilter,
    };
}

function buildFundsHistoryWalletQuery(kind, userFilter, dateMatch) {
    const base = kind === 'deposit' ? MANUAL_WALLET_DEPOSIT_MATCH : MANUAL_WALLET_WITHDRAWAL_MATCH;
    return { ...base, ...buildWalletTxnMatch(userFilter, dateMatch) };
}

function mapPaymentHistoryRow(doc) {
    const player = doc.userId && typeof doc.userId === 'object'
        ? { _id: doc.userId._id, username: doc.userId.username, phone: doc.userId.phone }
        : null;
    return {
        _id: String(doc._id),
        source: 'payment',
        type: doc.type,
        amount: Number(doc.amount) || 0,
        status: doc.status,
        player,
        description: doc.type === 'deposit' ? 'Player deposit' : 'Player withdrawal',
        remarks: doc.adminRemarks || doc.userNote || '',
        createdAt: doc.createdAt,
    };
}

function mapWalletHistoryRow(doc, kind) {
    const player = doc.userId && typeof doc.userId === 'object'
        ? { _id: doc.userId._id, username: doc.userId.username, phone: doc.userId.phone }
        : null;
    return {
        _id: String(doc._id),
        source: 'manual_wallet',
        type: kind,
        amount: Number(doc.amount) || 0,
        status: 'completed',
        player,
        description: doc.description || (kind === 'deposit' ? 'Admin wallet credit' : 'Admin wallet debit'),
        remarks: doc.description || '',
        createdAt: doc.createdAt,
    };
}

/** Unified deposit/withdrawal history (payments + admin/bookie wallet adjustments). */
export async function fetchFundsHistory({ kind, paymentFilter, dateMatch, page, limit, skip }) {
    const paymentQuery = buildFundsHistoryPaymentQuery(kind, paymentFilter, dateMatch);
    const walletQuery = buildFundsHistoryWalletQuery(kind, paymentFilter, dateMatch);

    const [payments, walletTxns, paymentTotal, walletTotal, paymentSumRow, walletSumRow] = await Promise.all([
        Payment.find(paymentQuery)
            .select('userId type amount status adminRemarks userNote createdAt')
            .populate('userId', 'username phone')
            .sort({ createdAt: -1 })
            .lean(),
        WalletTransaction.find(walletQuery)
            .select('userId type amount description createdAt')
            .populate('userId', 'username phone')
            .sort({ createdAt: -1 })
            .lean(),
        Payment.countDocuments(paymentQuery),
        WalletTransaction.countDocuments(walletQuery),
        Payment.aggregate([{ $match: paymentQuery }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        WalletTransaction.aggregate([{ $match: walletQuery }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const merged = [
        ...payments.map(mapPaymentHistoryRow),
        ...walletTxns.map((row) => mapWalletHistoryRow(row, kind)),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = paymentTotal + walletTotal;
    const totalAmount = (paymentSumRow[0]?.total || 0) + (walletSumRow[0]?.total || 0);
    const items = merged.slice(skip, skip + limit);

    return { items, total, totalAmount };
}
