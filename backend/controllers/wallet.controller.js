import User from '../models/user/user.js';
import { gapRequest } from '../services/gap.service.js';
import mongoose from 'mongoose';
import GapWalletTransaction from '../models/gapWalletTransaction.model.js';
import logger from '../utils/logger.js';

/**
 * Debit user wallet balance.
 * POST /api/wallet/debit
 * Body: { userId, amount, transactionId, gapPublicKey? }
 */
export const debitWallet = async (req, res) => {
    let session;
    try {
        const body = req.gapPayload && typeof req.gapPayload === 'object' ? req.gapPayload : (req.body || {});
        const { userId, amount, transactionId, gapPublicKey } = body;
        logger.info('Wallet debit request received', { userId, transactionId, amount, ip: req.ip });

        if (!userId || amount === undefined || !transactionId) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'userId, amount and transactionId are required',
                transactionId: transactionId || null,
            });
        }
        if (!mongoose.Types.ObjectId.isValid(String(userId))) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid userId',
                transactionId,
            });
        }

        const debitAmount = Number(amount);
        if (!Number.isFinite(debitAmount) || debitAmount <= 0) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'amount must be a positive number',
                transactionId,
            });
        }

        // Idempotency: if transaction already processed, return SUCCESS with stored balance.
        const existingTx = await GapWalletTransaction.findOne({ transactionId: String(transactionId).trim() }).lean();
        if (existingTx) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Duplicate transaction ignored',
                balance: Number(existingTx.balanceAfter || 0),
                transactionId,
            });
        }

        session = await mongoose.startSession();
        let finalBalance = 0;
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }

            if (Number(user.balance || 0) < debitAmount) {
                const err = new Error('Insufficient balance');
                err.code = 'INSUFFICIENT_BALANCE';
                err.currentBalance = Number(user.balance || 0);
                throw err;
            }

            user.balance = Number(user.balance || 0) - debitAmount;
            await user.save({ session });
            finalBalance = Number(user.balance || 0);

            await GapWalletTransaction.create(
                [{
                    transactionId: String(transactionId).trim(),
                    userId: user._id,
                    type: 'debit',
                    amount: debitAmount,
                    status: 'SUCCESS',
                    balanceAfter: finalBalance,
                    requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
                }],
                { session }
            );
        });

        // Optional external notify to GAP if partner public key is provided.
        if (gapPublicKey) {
            try {
                const gapRes = await gapRequest('/wallet/debit', {
                    operatorId: process.env.OPERATOR_ID,
                    userId: String(userId),
                    amount: debitAmount,
                    transactionId,
                    balance: Number(finalBalance || 0),
                }, gapPublicKey);
                logger.info('GAP debit notify response', { transactionId, gapRes });
            } catch (gapError) {
                logger.warn('GAP debit notify failed', { transactionId, error: gapError.message });
            }
        }

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Debit processed successfully',
            balance: Number(finalBalance || 0),
            transactionId,
        });
    } catch (error) {
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Insufficient balance',
                balance: Number(error.currentBalance || 0),
                transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            });
        }
        if (error.message === 'User not found') {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found',
                transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            });
        }
        logger.error('Wallet debit error', { error: error.message });
        return res.status(500).json({
            status: 'FAILED',
            message: error.message || 'Internal server error',
            transactionId: (req.gapPayload || req.body || {}).transactionId || null,
        });
    } finally {
        if (session) await session.endSession();
    }
};

/**
 * Credit user wallet balance.
 * POST /api/wallet/credit
 * Body: { userId, amount, transactionId, gapPublicKey? }
 */
export const creditWallet = async (req, res) => {
    let session;
    try {
        const body = req.gapPayload && typeof req.gapPayload === 'object' ? req.gapPayload : (req.body || {});
        const { userId, amount, transactionId, gapPublicKey } = body;
        logger.info('Wallet credit request received', { userId, transactionId, amount, ip: req.ip });

        if (!userId || amount === undefined || !transactionId) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'userId, amount and transactionId are required',
                transactionId: transactionId || null,
            });
        }
        if (!mongoose.Types.ObjectId.isValid(String(userId))) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid userId',
                transactionId,
            });
        }

        const creditAmount = Number(amount);
        if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'amount must be a positive number',
                transactionId,
            });
        }

        // Idempotency: already processed tx should return success with previous balance.
        const existingTx = await GapWalletTransaction.findOne({ transactionId: String(transactionId).trim() }).lean();
        if (existingTx) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Duplicate transaction ignored',
                balance: Number(existingTx.balanceAfter || 0),
                transactionId,
            });
        }

        session = await mongoose.startSession();
        let finalBalance = 0;
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) {
                throw new Error('User not found');
            }

            user.balance = Number(user.balance || 0) + creditAmount;
            await user.save({ session });
            finalBalance = Number(user.balance || 0);

            await GapWalletTransaction.create(
                [{
                    transactionId: String(transactionId).trim(),
                    userId: user._id,
                    type: 'credit',
                    amount: creditAmount,
                    status: 'SUCCESS',
                    balanceAfter: finalBalance,
                    requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
                }],
                { session }
            );
        });

        // Optional external notify to GAP if partner public key is provided.
        if (gapPublicKey) {
            try {
                const gapRes = await gapRequest('/wallet/credit', {
                    operatorId: process.env.OPERATOR_ID,
                    userId: String(userId),
                    amount: creditAmount,
                    transactionId,
                    balance: Number(finalBalance || 0),
                }, gapPublicKey);
                logger.info('GAP credit notify response', { transactionId, gapRes });
            } catch (gapError) {
                logger.warn('GAP credit notify failed', { transactionId, error: gapError.message });
            }
        }

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Credit processed successfully',
            balance: Number(finalBalance || 0),
            transactionId,
        });
    } catch (error) {
        if (error.message === 'User not found') {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found',
                transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            });
        }
        logger.error('Wallet credit error', { error: error.message });
        return res.status(500).json({
            status: 'FAILED',
            message: error.message || 'Internal server error',
            transactionId: (req.gapPayload || req.body || {}).transactionId || null,
        });
    } finally {
        if (session) await session.endSession();
    }
};

/**
 * Get transaction detail by transactionId.
 * GET /api/wallet/transaction/:transactionId
 */
export const getWalletTransactionById = async (req, res) => {
    try {
        const transactionId = String(req.params?.transactionId || '').trim();
        if (!transactionId) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'transactionId is required',
                transactionId: null,
            });
        }

        const tx = await GapWalletTransaction.findOne({ transactionId }).lean();
        if (!tx) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Transaction not found',
                transactionId,
            });
        }

        return res.status(200).json({
            status: tx.status || 'SUCCESS',
            message: 'Transaction found',
            userId: tx.userId,
            amount: Number(tx.amount || 0),
            type: tx.type,
            balanceAfter: Number(tx.balanceAfter || 0),
            createdAt: tx.createdAt,
            transactionId: tx.transactionId,
        });
    } catch (error) {
        logger.error('Wallet transaction lookup error', { error: error.message });
        return res.status(500).json({
            status: 'FAILED',
            message: error.message || 'Internal server error',
            transactionId: String(req.params?.transactionId || '') || null,
        });
    }
};
