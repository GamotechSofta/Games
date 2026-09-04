import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import GapWalletTransaction from '../models/gapWalletTransaction.model.js';
import { verifyOperatorUserToken } from '../utils/jwt.js';
import { notifyPlayerWalletBalance } from '../utils/playerWalletNotify.js';
import logger from '../utils/logger.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const PLATFORM_OPERATOR_ID = String(
    process.env.OPERATOR_ID || process.env.APP_OPERATOR_ID || '1'
).trim() || '1';

/**
 * Permanent failures should be acknowledged (no retry).
 * Transient failures should be retried via delayed republish.
 */
export class CashoutPermanentError extends Error {
    constructor(message, code = 'PERMANENT') {
        super(message);
        this.name = 'CashoutPermanentError';
        this.code = code;
        this.permanent = true;
    }
}

/**
 * Apply an operator wallet credit from a `games_cashout` RabbitMQ message.
 * Idempotent on `txn_id`. Links credit to original debit via `txn_ref_id`.
 *
 * @param {object} message
 * @returns {Promise<{ duplicate: boolean, balance: number, userId: string, transactionId: string }>}
 */
export async function applyOperatorCashoutCredit(message) {
    const txnId = String(message?.txn_id || '').trim();
    const txnRefId = String(message?.txn_ref_id || '').trim();
    const amount = Number(message?.amount);
    const userId = String(message?.user_id || '').trim();
    const token = String(message?.token || '').trim();
    const gameId = String(message?.game_id || process.env.APP_OPERATOR_GAME_ID || '2').trim();
    const description = String(message?.description || '').trim();
    const ip = String(message?.ip || '').trim();
    const operatorId = String(message?.operatorId || message?.operator_id || PLATFORM_OPERATOR_ID).trim();

    if (!txnId) {
        throw new CashoutPermanentError('txn_id is required', 'MISSING_TXN_ID');
    }
    if (!token) {
        throw new CashoutPermanentError('token is required', 'MISSING_TOKEN');
    }
    if (!userId || !isValidObjectId(userId)) {
        throw new CashoutPermanentError('user_id is invalid', 'INVALID_USER_ID');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new CashoutPermanentError('amount must be a positive number', 'INVALID_AMOUNT');
    }

    const decoded = verifyOperatorUserToken(token);
    if (!decoded?.id || !isValidObjectId(decoded.id)) {
        throw new CashoutPermanentError('Invalid or missing user token', 'INVALID_TOKEN');
    }
    if (String(decoded.id) !== userId) {
        throw new CashoutPermanentError('user_id does not match token', 'USER_TOKEN_MISMATCH');
    }

    const existingTx = await GapWalletTransaction.findOne({ transactionId: txnId }).lean();
    if (existingTx) {
        logger.info('[OPERATOR][CASHOUT] duplicate txn acknowledged', {
            txnId,
            userId,
            balanceAfter: existingTx.balanceAfter,
        });
        return {
            duplicate: true,
            balance: Number(existingTx.balanceAfter || 0),
            userId,
            transactionId: txnId,
        };
    }

    const user = await User.findById(userId).select('_id username phone +balance isActive').lean();
    if (!user) {
        throw new CashoutPermanentError('User not found', 'USER_NOT_FOUND');
    }
    if (user.isActive === false) {
        throw new CashoutPermanentError('Account suspended', 'USER_SUSPENDED');
    }

    let finalBalance = 0;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const lockedUser = await User.findById(userId).session(session);
            if (!lockedUser) {
                throw new CashoutPermanentError('User not found', 'USER_NOT_FOUND');
            }

            let wallet = await Wallet.findOne({ userId: lockedUser._id }).session(session);
            if (!wallet) {
                wallet = new Wallet({
                    userId: lockedUser._id,
                    balance: Number(lockedUser.balance || 0),
                });
            }

            const current = Number(wallet.balance || 0);
            wallet.balance = current + amount;
            await wallet.save({ session });
            finalBalance = Number(wallet.balance || 0);

            await GapWalletTransaction.create(
                [
                    {
                        transactionId: txnId,
                        userId: lockedUser._id,
                        type: 'CREDIT',
                        amount,
                        status: 'SUCCESS',
                        balanceAfter: finalBalance,
                        requestMeta: {
                            ip,
                            source: 'operator-games-cashout',
                            description,
                            operator_id: operatorId || PLATFORM_OPERATOR_ID,
                            txn_ref_id: txnRefId,
                            txn_type: message?.txn_type ?? 1,
                        },
                        gameId,
                        roundId: txnRefId,
                        originalTransactionId: txnRefId,
                        rolledBack: false,
                        rawPayload: message,
                        provider: 'OPERATOR_CASHOUT',
                        remarks: description || `Credit for txn_ref_id ${txnRefId}`,
                    },
                ],
                { session }
            );
        });
    } catch (error) {
        if (error?.code === 11000) {
            const raced = await GapWalletTransaction.findOne({ transactionId: txnId }).lean();
            return {
                duplicate: true,
                balance: Number(raced?.balanceAfter || 0),
                userId,
                transactionId: txnId,
            };
        }
        if (error instanceof CashoutPermanentError) {
            throw error;
        }
        throw error;
    } finally {
        await session.endSession();
    }

    notifyPlayerWalletBalance(userId, 'operator_cashout_credit', finalBalance).catch(() => {});

    logger.info('[OPERATOR][CASHOUT] credited', {
        userId,
        txnId,
        txnRefId,
        amount,
        balance: finalBalance,
        gameId,
        operatorId,
    });

    return {
        duplicate: false,
        balance: finalBalance,
        userId,
        transactionId: txnId,
    };
}
