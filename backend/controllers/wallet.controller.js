import User from '../models/user/user.js';
import { gapRequest } from '../services/gap.service.js';
import mongoose from 'mongoose';
import GapWalletTransaction from '../models/gapWalletTransaction.model.js';
import { Wallet } from '../models/wallet/wallet.js';
import logger, { sanitizeForLog } from '../utils/logger.js';

const getRequestBody = (req) =>
    req.gapPayload && typeof req.gapPayload === 'object' ? req.gapPayload : (req.body || {});

const ok = (res, payload) => res.status(200).json({ success: true, status: 'SUCCESS', ...payload });
const fail = (res, code, message, payload = {}) =>
    res.status(code).json({ success: false, status: 'FAILED', message, ...payload });

const audit = (req, route, status, meta = {}) => {
    const body = getRequestBody(req) || {};
    const details = sanitizeForLog({
        route,
        method: req.method,
        timestamp: new Date().toISOString(),
        userId: body.userId || meta.userId || null,
        transactionId: body.transactionId || meta.transactionId || null,
        status,
        request: body,
        responseSummary: meta.responseSummary || null,
    });
    if (status === 'FAILED') logger.warn('[WALLET_CALLBACK_AUDIT]', details);
    else logger.info('[WALLET_CALLBACK_AUDIT]', details);
};

/**
 * Single source of truth for wallet balance is Wallet.balance.
 * Backward-compatible fallback: if wallet is missing, seed from legacy User.balance.
 */
const getOrCreateWalletForUser = async (userId, session = null) => {
    const userQuery = User.findById(userId).select('_id +balance');
    const user = session ? await userQuery.session(session) : await userQuery;
    if (!user) return { user: null, wallet: null };

    const walletQuery = Wallet.findOne({ userId: user._id });
    let wallet = session ? await walletQuery.session(session) : await walletQuery;
    if (!wallet) {
        wallet = new Wallet({
            userId: user._id,
            balance: Number(user.balance || 0),
        });
        if (session) {
            await wallet.save({ session });
        } else {
            await wallet.save();
        }
    }
    return { user, wallet };
};

/**
 * Wallet balance
 * POST /api/wallet/balance
 * Body: { userId }
 */
export const walletBalance = async (req, res) => {
    try {
        const { userId } = getRequestBody(req);
        audit(req, '/api/wallet/balance', 'REQUESTED');
        if (!userId) return fail(res, 400, 'userId is required');
        if (!mongoose.Types.ObjectId.isValid(String(userId))) return fail(res, 400, 'Invalid userId');

        const { user, wallet } = await getOrCreateWalletForUser(userId);
        if (!user || !wallet) return fail(res, 404, 'User not found');

        const response = { balance: Number(wallet.balance || 0), message: 'Balance fetched successfully' };
        logger.info('Wallet balance response', { userId, balance: response.balance });
        audit(req, '/api/wallet/balance', 'SUCCESS', {
            userId,
            responseSummary: { balance: response.balance, message: response.message },
        });
        return ok(res, response);
    } catch (error) {
        logger.error('Wallet balance error', { error: error.message });
        audit(req, '/api/wallet/balance', 'FAILED', { responseSummary: { message: 'Internal server error' } });
        return fail(res, 500, 'Internal server error');
    }
};

/**
 * Debit user wallet balance.
 * POST /api/wallet/debit
 * Body: { userId, amount, transactionId, gapPublicKey? }
 */
export const debitWallet = async (req, res) => {
    let session;
    try {
        const body = getRequestBody(req);
        const { userId, amount, transactionId, gameId, roundId, gapPublicKey } = body;
        audit(req, '/api/wallet/debit', 'REQUESTED', { userId, transactionId });

        if (!userId || amount === undefined || !transactionId) {
            return fail(res, 400, 'userId, amount and transactionId are required', { transactionId: transactionId || null });
        }
        if (!mongoose.Types.ObjectId.isValid(String(userId))) {
            return fail(res, 400, 'Invalid userId', { transactionId });
        }

        const debitAmount = Number(amount);
        if (!Number.isFinite(debitAmount) || debitAmount <= 0) {
            return fail(res, 400, 'amount must be a positive number', { transactionId });
        }

        // Idempotency: if transaction already processed, return SUCCESS with stored balance.
        const existingTx = await GapWalletTransaction.findOne({ transactionId: String(transactionId).trim() }).lean();
        if (existingTx) {
            audit(req, '/api/wallet/debit', 'SUCCESS', {
                userId,
                transactionId,
                responseSummary: { duplicate: true, balance: Number(existingTx.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Duplicate transaction ignored',
                balance: Number(existingTx.balanceAfter || 0),
                transactionId,
            });
        }

        session = await mongoose.startSession();
        let finalBalance = 0;
        await session.withTransaction(async () => {
            const { user, wallet } = await getOrCreateWalletForUser(userId, session);
            if (!user || !wallet) {
                throw new Error('User not found');
            }

            if (Number(wallet.balance || 0) < debitAmount) {
                const err = new Error('Insufficient balance');
                err.code = 'INSUFFICIENT_BALANCE';
                err.currentBalance = Number(wallet.balance || 0);
                throw err;
            }

            wallet.balance = Number(wallet.balance || 0) - debitAmount;
            await wallet.save({ session });
            finalBalance = Number(wallet.balance || 0);

            await GapWalletTransaction.create(
                [{
                    transactionId: String(transactionId).trim(),
                    userId: user._id,
                    type: 'DEBIT',
                    amount: debitAmount,
                    status: 'SUCCESS',
                    balanceAfter: finalBalance,
                    requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
                    gameId: String(gameId || '').trim(),
                    roundId: String(roundId || '').trim(),
                    rolledBack: false,
                    rawPayload: body,
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
                    gameId: String(gameId || '').trim(),
                    roundId: String(roundId || '').trim(),
                    balance: Number(finalBalance || 0),
                }, gapPublicKey);
                logger.info('GAP debit notify response', { transactionId, gapRes });
            } catch (gapError) {
                logger.warn('GAP debit notify failed', { transactionId, error: gapError.message });
            }
        }

        audit(req, '/api/wallet/debit', 'SUCCESS', {
            userId,
            transactionId,
            responseSummary: { balance: Number(finalBalance || 0), message: 'Debit processed successfully' },
        });
        return ok(res, {
            message: 'Debit processed successfully',
            balance: Number(finalBalance || 0),
            transactionId,
        });
    } catch (error) {
        if (error?.code === 11000) {
            const txId = String((req.gapPayload || req.body || {}).transactionId || '').trim();
            const existingTx = txId
                ? await GapWalletTransaction.findOne({ transactionId: txId }).lean()
                : null;
            audit(req, '/api/wallet/debit', 'SUCCESS', {
                userId: (req.gapPayload || req.body || {}).userId || null,
                transactionId: txId || null,
                responseSummary: { duplicate: true, balance: Number(existingTx?.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Duplicate transaction ignored',
                balance: Number(existingTx?.balanceAfter || 0),
                transactionId: txId || null,
            });
        }
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return fail(res, 400, 'Insufficient balance', {
                balance: Number(error.currentBalance || 0),
                transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            });
        }
        if (error.message === 'User not found') {
            return fail(res, 404, 'User not found', {
                transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            });
        }
        logger.error('Wallet debit error', { error: error.message });
        audit(req, '/api/wallet/debit', 'FAILED', {
            userId: (req.gapPayload || req.body || {}).userId || null,
            transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            responseSummary: { message: 'Internal server error' },
        });
        return fail(res, 500, 'Internal server error', {
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
        const body = getRequestBody(req);
        const { userId, amount, transactionId, gameId, roundId, gapPublicKey } = body;
        audit(req, '/api/wallet/credit', 'REQUESTED', { userId, transactionId });

        if (!userId || amount === undefined || !transactionId) {
            return fail(res, 400, 'userId, amount and transactionId are required', { transactionId: transactionId || null });
        }
        if (!mongoose.Types.ObjectId.isValid(String(userId))) {
            return fail(res, 400, 'Invalid userId', { transactionId });
        }

        const creditAmount = Number(amount);
        if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
            return fail(res, 400, 'amount must be a positive number', { transactionId });
        }

        // Idempotency: already processed tx should return success with previous balance.
        const existingTx = await GapWalletTransaction.findOne({ transactionId: String(transactionId).trim() }).lean();
        if (existingTx) {
            audit(req, '/api/wallet/credit', 'SUCCESS', {
                userId,
                transactionId,
                responseSummary: { duplicate: true, balance: Number(existingTx.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Duplicate transaction ignored',
                balance: Number(existingTx.balanceAfter || 0),
                transactionId,
            });
        }

        session = await mongoose.startSession();
        let finalBalance = 0;
        await session.withTransaction(async () => {
            const { user, wallet } = await getOrCreateWalletForUser(userId, session);
            if (!user || !wallet) {
                throw new Error('User not found');
            }

            wallet.balance = Number(wallet.balance || 0) + creditAmount;
            await wallet.save({ session });
            finalBalance = Number(wallet.balance || 0);

            await GapWalletTransaction.create(
                [{
                    transactionId: String(transactionId).trim(),
                    userId: user._id,
                    type: 'CREDIT',
                    amount: creditAmount,
                    status: 'SUCCESS',
                    balanceAfter: finalBalance,
                    requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
                    gameId: String(gameId || '').trim(),
                    roundId: String(roundId || '').trim(),
                    rolledBack: false,
                    rawPayload: body,
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
                    gameId: String(gameId || '').trim(),
                    roundId: String(roundId || '').trim(),
                    balance: Number(finalBalance || 0),
                }, gapPublicKey);
                logger.info('GAP credit notify response', { transactionId, gapRes });
            } catch (gapError) {
                logger.warn('GAP credit notify failed', { transactionId, error: gapError.message });
            }
        }

        audit(req, '/api/wallet/credit', 'SUCCESS', {
            userId,
            transactionId,
            responseSummary: { balance: Number(finalBalance || 0), message: 'Credit processed successfully' },
        });
        return ok(res, {
            message: 'Credit processed successfully',
            balance: Number(finalBalance || 0),
            transactionId,
        });
    } catch (error) {
        if (error?.code === 11000) {
            const txId = String((req.gapPayload || req.body || {}).transactionId || '').trim();
            const existingTx = txId
                ? await GapWalletTransaction.findOne({ transactionId: txId }).lean()
                : null;
            audit(req, '/api/wallet/credit', 'SUCCESS', {
                userId: (req.gapPayload || req.body || {}).userId || null,
                transactionId: txId || null,
                responseSummary: { duplicate: true, balance: Number(existingTx?.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Duplicate transaction ignored',
                balance: Number(existingTx?.balanceAfter || 0),
                transactionId: txId || null,
            });
        }
        if (error.message === 'User not found') {
            return fail(res, 404, 'User not found', {
                transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            });
        }
        logger.error('Wallet credit error', { error: error.message });
        audit(req, '/api/wallet/credit', 'FAILED', {
            userId: (req.gapPayload || req.body || {}).userId || null,
            transactionId: (req.gapPayload || req.body || {}).transactionId || null,
            responseSummary: { message: 'Internal server error' },
        });
        return fail(res, 500, 'Internal server error', {
            transactionId: (req.gapPayload || req.body || {}).transactionId || null,
        });
    } finally {
        if (session) await session.endSession();
    }
};

/**
 * Wallet rollback
 * POST /api/wallet/rollback
 * Body: { transactionId }
 */
export const rollbackWallet = async (req, res) => {
    let session;
    try {
        const body = getRequestBody(req);
        const { transactionId } = body;
        audit(req, '/api/wallet/rollback', 'REQUESTED', { transactionId });
        if (!transactionId) return fail(res, 400, 'transactionId is required');

        const txId = String(transactionId).trim();
        const existingRollback = await GapWalletTransaction.findOne({
            originalTransactionId: txId,
            type: { $in: ['ROLLBACK', 'rollback'] },
        }).lean();
        if (existingRollback) {
            audit(req, '/api/wallet/rollback', 'SUCCESS', {
                transactionId: txId,
                responseSummary: { duplicate: true, balance: Number(existingRollback.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Rollback already processed',
                balance: Number(existingRollback.balanceAfter || 0),
                transactionId: txId,
            });
        }

        session = await mongoose.startSession();
        let finalBalance = 0;
        await session.withTransaction(async () => {
            const originalTx = await GapWalletTransaction.findOne({
                transactionId: txId,
                type: { $in: ['DEBIT', 'debit'] },
            }).session(session);

            if (!originalTx) {
                const err = new Error('Original debit transaction not found');
                err.code = 'NOT_FOUND';
                throw err;
            }
            if (originalTx.rolledBack) {
                const err = new Error('ALREADY_ROLLED_BACK');
                err.code = 'ALREADY_ROLLED_BACK';
                throw err;
            }

            const { user, wallet } = await getOrCreateWalletForUser(originalTx.userId, session);
            if (!user || !wallet) {
                const err = new Error('User not found');
                err.code = 'USER_NOT_FOUND';
                throw err;
            }

            wallet.balance = Number(wallet.balance || 0) + Number(originalTx.amount || 0);
            await wallet.save({ session });
            finalBalance = Number(wallet.balance || 0);

            originalTx.rolledBack = true;
            await originalTx.save({ session });

            const rollbackTxnId = `RBK_${txId}`;
            await GapWalletTransaction.create(
                [{
                    transactionId: rollbackTxnId,
                    originalTransactionId: txId,
                    userId: originalTx.userId,
                    type: 'ROLLBACK',
                    amount: Number(originalTx.amount || 0),
                    status: 'SUCCESS',
                    balanceAfter: finalBalance,
                    gameId: originalTx.gameId || '',
                    roundId: originalTx.roundId || '',
                    rolledBack: false,
                    rawPayload: body,
                    requestMeta: { ip: req.ip, source: 'gap-wallet-api' },
                    remarks: 'Rollback for debit transaction',
                }],
                { session }
            );
        });

        audit(req, '/api/wallet/rollback', 'SUCCESS', {
            transactionId: txId,
            responseSummary: { balance: Number(finalBalance || 0), message: 'Rollback successful' },
        });
        return ok(res, {
            message: 'Rollback successful',
            balance: Number(finalBalance || 0),
            transactionId: txId,
        });
    } catch (error) {
        if (error?.code === 11000) {
            const txId = String((getRequestBody(req) || {}).transactionId || '').trim();
            const existingRollback = txId
                ? await GapWalletTransaction.findOne({
                    originalTransactionId: txId,
                    type: { $in: ['ROLLBACK', 'rollback'] },
                }).lean()
                : null;
            audit(req, '/api/wallet/rollback', 'SUCCESS', {
                transactionId: txId || null,
                responseSummary: { duplicate: true, balance: Number(existingRollback?.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Rollback already processed',
                balance: Number(existingRollback?.balanceAfter || 0),
                transactionId: txId || null,
            });
        }
        if (error.code === 'NOT_FOUND') return fail(res, 404, 'Original debit transaction not found');
        if (error.code === 'ALREADY_ROLLED_BACK') {
            const txId = String((getRequestBody(req) || {}).transactionId || '').trim();
            const existingRollback = await GapWalletTransaction.findOne({
                originalTransactionId: txId,
                type: { $in: ['ROLLBACK', 'rollback'] },
            }).lean();
            audit(req, '/api/wallet/rollback', 'SUCCESS', {
                transactionId: txId,
                responseSummary: { duplicate: true, balance: Number(existingRollback?.balanceAfter || 0) },
            });
            return ok(res, {
                message: 'Rollback already processed',
                balance: Number(existingRollback?.balanceAfter || 0),
                transactionId: txId,
            });
        }
        if (error.code === 'USER_NOT_FOUND') return fail(res, 404, 'User not found');
        logger.error('Wallet rollback error', { error: error.message });
        audit(req, '/api/wallet/rollback', 'FAILED', {
            transactionId: (getRequestBody(req) || {}).transactionId || null,
            responseSummary: { message: 'Internal server error' },
        });
        return fail(res, 500, 'Internal server error');
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
                success: false,
                status: 'FAILED',
                message: 'transactionId is required',
                transactionId: null,
            });
        }

        const tx = await GapWalletTransaction.findOne({ transactionId }).lean();
        if (!tx) {
            return res.status(404).json({
                success: false,
                status: 'FAILED',
                message: 'Transaction not found',
                transactionId,
            });
        }

        return res.status(200).json({
            success: true,
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
            success: false,
            status: 'FAILED',
            message: 'Internal server error',
            transactionId: String(req.params?.transactionId || '') || null,
        });
    }
};
