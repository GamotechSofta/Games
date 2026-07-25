import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import GapWalletTransaction from '../models/gapWalletTransaction.model.js';
import {
    generateOperatorUserToken,
    verifyOperatorUserToken,
} from '../utils/jwt.js';
import logger from '../utils/logger.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

function pickToken(req) {
    const body = req.body || {};
    const q = req.query || {};
    const auth = String(req.headers.authorization || '');
    if (auth.toLowerCase().startsWith('bearer ')) {
        return auth.slice(7).trim();
    }
    return String(
        body.token ||
            body.id ||
            body.userToken ||
            body.operator_user_token ||
            q.token ||
            q.id ||
            ''
    ).trim();
}

function pickUserId(req, decoded) {
    const body = req.body || {};
    const q = req.query || {};
    return String(
        body.user_id ||
            body.userId ||
            body.userid ||
            q.user_id ||
            q.userId ||
            decoded?.id ||
            ''
    ).trim();
}

async function getOrCreateWallet(userId) {
    const user = await User.findById(userId)
        .select('_id username phone +balance isActive')
        .lean();
    if (!user) return { user: null, wallet: null };

    let wallet = await Wallet.findOne({ userId: user._id }).select('balance').lean();
    if (!wallet) {
        const created = await Wallet.create({
            userId: user._id,
            balance: Number(user.balance || 0),
        });
        wallet = { balance: Number(created.balance || 0) };
    }
    return { user, wallet };
}

function ok(res, data, message = 'success') {
    // PotLudo operator gateway treats non-zero `code`/`status` as failure
    // (error was: "Operator gateway request failed with status 200.")
    return res.status(200).json({
        status: 0,
        success: true,
        code: 0,
        errorCode: 0,
        message,
        errorMessage: message,
        data,
        result: data,
    });
}

function fail(res, httpCode, message, extra = {}) {
    const code = Number(httpCode) || 400;
    return res.status(code).json({
        status: code,
        success: false,
        code,
        errorCode: code,
        message,
        errorMessage: message,
        ...extra,
    });
}

/** Log raw operator requests to diagnose PotLudo gateway contract. */
export function logOperatorRequest(req, _res, next) {
    try {
        logger.info('[OPERATOR] request', {
            method: req.method,
            path: req.originalUrl || req.url,
            query: req.query || {},
            body: req.body || {},
            auth: req.headers.authorization ? 'present' : 'absent',
            contentType: req.headers['content-type'] || '',
        });
    } catch (_) {}
    next();
}

/**
 * Resolve user from operator launch token or user_id + token.
 */
async function resolveOperatorUser(req) {
    const token = pickToken(req);
    const decoded = token ? verifyOperatorUserToken(token) : null;
    const userId = pickUserId(req, decoded);

    if (!userId || !isValidObjectId(userId)) {
        return { error: { code: 400, message: 'Invalid or missing user token / user_id' } };
    }

    // If a token was sent, it must match the user.
    if (token && decoded && String(decoded.id) !== String(userId)) {
        return { error: { code: 401, message: 'Token does not match user' } };
    }
    if (token && !decoded) {
        return { error: { code: 401, message: 'Invalid or expired operator token' } };
    }

    const { user, wallet } = await getOrCreateWallet(userId);
    if (!user) {
        return { error: { code: 404, message: 'User not found' } };
    }
    if (user.isActive === false) {
        return { error: { code: 403, message: 'Account suspended' } };
    }

    return {
        user,
        wallet,
        token: token || generateOperatorUserToken({ id: user._id, phone: user.phone }),
        decoded,
    };
}

/**
 * POST /operator/user/login
 * Body/query: { id|token } — the OPERATOR_USER_TOKEN from launch URL
 *
 * Called by PotLudo when the player opens:
 * https://fashionbuddies.in/?id=<TOKEN>&game_id=2
 */
export const operatorUserLogin = async (req, res) => {
    try {
        const token = pickToken(req);
        if (!token) {
            return fail(res, 400, 'token (id) is required');
        }

        const decoded = verifyOperatorUserToken(token);
        if (!decoded?.id) {
            return fail(res, 401, 'Invalid or expired operator token');
        }

        const { user, wallet } = await getOrCreateWallet(decoded.id);
        if (!user) return fail(res, 404, 'User not found');
        if (user.isActive === false) return fail(res, 403, 'Account suspended');

        const sessionToken = generateOperatorUserToken({
            id: user._id,
            phone: user.phone,
            gameId: decoded.gameId || req.body?.game_id || req.body?.gameId,
        });

        logger.info('[OPERATOR] user login', { userId: String(user._id) });

        return ok(
            res,
            {
                id: String(user._id),
                user_id: String(user._id),
                name: user.username || user.phone || 'Player',
                username: user.username || user.phone || 'Player',
                phone: user.phone || '',
                mobile: user.phone || '',
                balance: Number(wallet.balance || 0),
                token: sessionToken,
                game_id: decoded.gameId || req.body?.game_id || process.env.APP_OPERATOR_GAME_ID || '2',
            },
            'Login successful'
        );
    } catch (error) {
        logger.error('[OPERATOR] login failed', { message: error?.message });
        return fail(res, 500, 'Internal server error');
    }
};

/**
 * POST|GET /service/user/detail
 * Auth: Bearer token or body.token / body.user_id
 */
export const operatorUserDetail = async (req, res) => {
    try {
        const resolved = await resolveOperatorUser(req);
        if (resolved.error) {
            return fail(res, resolved.error.code, resolved.error.message);
        }

        const { user, wallet, token } = resolved;
        return ok(res, {
            id: String(user._id),
            user_id: String(user._id),
            name: user.username || user.phone || 'Player',
            username: user.username || user.phone || 'Player',
            phone: user.phone || '',
            mobile: user.phone || '',
            balance: Number(wallet.balance || 0),
            token,
            image: '',
            avatar: '',
        });
    } catch (error) {
        logger.error('[OPERATOR] user detail failed', { message: error?.message });
        return fail(res, 500, 'Internal server error');
    }
};

/**
 * POST|GET /service/operator/user/balance/v2
 *
 * Get balance:
 *   { user_id, token }
 *
 * Debit / credit (gameplay):
 *   { user_id, token, amount, txn_type|type, txn_id|transactionId, game_id? }
 *   txn_type: debit|0|DEBIT  or  credit|1|CREDIT
 */
export const operatorUserBalanceV2 = async (req, res) => {
    let session;
    try {
        const resolved = await resolveOperatorUser(req);
        if (resolved.error) {
            return fail(res, resolved.error.code, resolved.error.message);
        }

        const body = req.body || {};
        const amountRaw = body.amount ?? body.coins ?? body.value;
        const hasAmount = amountRaw !== undefined && amountRaw !== null && String(amountRaw) !== '';

        // Read-only balance
        if (!hasAmount) {
            return ok(res, {
                user_id: String(resolved.user._id),
                balance: Number(resolved.wallet.balance || 0),
                currency: 'INR',
            });
        }

        const amount = Number(amountRaw);
        if (!Number.isFinite(amount) || amount <= 0) {
            return fail(res, 400, 'amount must be a positive number');
        }

        const txnTypeRaw = String(
            body.txn_type ?? body.type ?? body.transaction_type ?? body.action ?? 'get'
        )
            .trim()
            .toLowerCase();

        let op = null;
        if (['debit', '0', 'debit_balance', 'bet', 'deduct', 'd'].includes(txnTypeRaw)) {
            op = 'DEBIT';
        } else if (['credit', '1', 'credit_balance', 'win', 'add', 'c'].includes(txnTypeRaw)) {
            op = 'CREDIT';
        } else {
            // Unknown type with amount — treat as get if type empty, else error
            if (!txnTypeRaw || txnTypeRaw === 'get' || txnTypeRaw === 'balance') {
                return ok(res, {
                    user_id: String(resolved.user._id),
                    balance: Number(resolved.wallet.balance || 0),
                    currency: 'INR',
                });
            }
            return fail(res, 400, 'txn_type must be debit or credit');
        }

        const transactionId = String(
            body.txn_id || body.transactionId || body.transaction_id || body.ref_id || ''
        ).trim();
        if (!transactionId) {
            return fail(res, 400, 'txn_id is required for debit/credit');
        }

        const existingTx = await GapWalletTransaction.findOne({
            transactionId,
        }).lean();
        if (existingTx) {
            return ok(res, {
                user_id: String(resolved.user._id),
                balance: Number(existingTx.balanceAfter || 0),
                transactionId,
                duplicate: true,
            }, 'Duplicate transaction ignored');
        }

        const gameId = String(
            body.game_id || body.gameId || process.env.APP_OPERATOR_GAME_ID || '2'
        ).trim();
        const roundId = String(body.round_id || body.roundId || '').trim();

        session = await mongoose.startSession();
        let finalBalance = 0;

        await session.withTransaction(async () => {
            const user = await User.findById(resolved.user._id).session(session);
            if (!user) throw Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND' });

            let wallet = await Wallet.findOne({ userId: user._id }).session(session);
            if (!wallet) {
                wallet = new Wallet({
                    userId: user._id,
                    balance: Number(user.balance || 0),
                });
            }

            const current = Number(wallet.balance || 0);
            if (op === 'DEBIT') {
                if (current < amount) {
                    throw Object.assign(new Error('Insufficient balance'), {
                        code: 'INSUFFICIENT_BALANCE',
                        currentBalance: current,
                    });
                }
                wallet.balance = current - amount;
            } else {
                wallet.balance = current + amount;
            }

            await wallet.save({ session });
            finalBalance = Number(wallet.balance || 0);

            await GapWalletTransaction.create(
                [
                    {
                        transactionId,
                        userId: user._id,
                        type: op,
                        amount,
                        status: 'SUCCESS',
                        balanceAfter: finalBalance,
                        requestMeta: { ip: req.ip, source: 'operator-balance-v2' },
                        gameId,
                        roundId,
                        rolledBack: false,
                        rawPayload: body,
                    },
                ],
                { session }
            );
        });

        logger.info('[OPERATOR] balance v2', {
            userId: String(resolved.user._id),
            op,
            amount,
            transactionId,
            balance: finalBalance,
        });

        return ok(res, {
            user_id: String(resolved.user._id),
            balance: finalBalance,
            transactionId,
            type: op,
        }, `${op} successful`);
    } catch (error) {
        if (error?.code === 11000) {
            const txId = String(
                (req.body || {}).txn_id || (req.body || {}).transactionId || ''
            ).trim();
            const existingTx = txId
                ? await GapWalletTransaction.findOne({ transactionId: txId }).lean()
                : null;
            return ok(res, {
                balance: Number(existingTx?.balanceAfter || 0),
                transactionId: txId || null,
                duplicate: true,
            }, 'Duplicate transaction ignored');
        }
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return fail(res, 400, 'Insufficient balance', {
                data: { balance: Number(error.currentBalance || 0) },
            });
        }
        if (error.code === 'USER_NOT_FOUND' || error.message === 'User not found') {
            return fail(res, 404, 'User not found');
        }
        logger.error('[OPERATOR] balance v2 failed', { message: error?.message });
        return fail(res, 500, 'Internal server error');
    } finally {
        if (session) await session.endSession();
    }
};
