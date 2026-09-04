import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import GapWalletTransaction from '../models/gapWalletTransaction.model.js';
import { verifyOperatorUserToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const PLATFORM_OPERATOR_ID = String(
    process.env.OPERATOR_ID || process.env.APP_OPERATOR_ID || '1'
).trim() || '1';

/**
 * PotLudo handoff: token comes from header `token` (preferred),
 * or Authorization Bearer, or body/query.
 */
function pickToken(req) {
    const headerToken = String(req.headers.token || '').trim();
    if (headerToken) return headerToken;

    const auth = String(req.headers.authorization || '');
    if (auth.toLowerCase().startsWith('bearer ')) {
        return auth.slice(7).trim();
    }

    const alt = String(
        req.headers['x-access-token'] ||
            req.headers['x-operator-token'] ||
            req.headers['x-user-token'] ||
            ''
    ).trim();
    if (alt) return alt;

    const body = req.body || {};
    const q = req.query || {};
    return String(
        body.token ||
            body.id ||
            body.userToken ||
            q.token ||
            q.id ||
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

/**
 * Resolve authenticated platform user from the launch/API token.
 */
async function resolveByUserToken(req) {
    const token = pickToken(req);
    if (!token) {
        return { error: { code: 400, message: 'Invalid or missing user token / user_id' } };
    }

    const decoded = verifyOperatorUserToken(token);
    if (!decoded?.id || !isValidObjectId(decoded.id)) {
        return { error: { code: 401, message: 'Invalid or missing user token / user_id' } };
    }

    const { user, wallet } = await getOrCreateWallet(decoded.id);
    if (!user) {
        return { error: { code: 404, message: 'User not found' } };
    }
    if (user.isActive === false) {
        return { error: { code: 403, message: 'Account suspended' } };
    }

    return { user, wallet, token, decoded };
}

function userObject(user, wallet) {
    const name = user.username || user.phone || 'Player';
    const id = String(user._id);
    const balance = Number(wallet?.balance || 0);
    return {
        user_id: id,
        userId: id,
        id,
        operator_id: PLATFORM_OPERATOR_ID,
        operatorId: PLATFORM_OPERATOR_ID,
        username: name,
        display_name: name,
        displayName: name,
        name,
        balance: String(balance),
        available_balance: String(balance),
        availableBalance: balance,
        currency: 'INR',
    };
}

/** PotLudo requires top-level status: true (boolean). */
function ok(res, payload = {}) {
    return res.status(200).json({
        status: true,
        success: true,
        code: 0,
        errorCode: 0,
        message: 'success',
        ...payload,
    });
}

function fail(res, httpCode, message, extra = {}) {
    const code = Number(httpCode) || 400;
    return res.status(code).json({
        status: false,
        success: false,
        code,
        errorCode: code,
        message,
        errorMessage: message,
        ...extra,
    });
}

/** Log raw operator requests (PotLudo gateway diagnostics). */
export function logOperatorRequest(req, _res, next) {
    try {
        logger.info('[OPERATOR] request', {
            method: req.method,
            path: req.originalUrl || req.url,
            query: req.query || {},
            body: req.body || {},
            tokenHeader: Boolean(req.headers.token),
            auth: req.headers.authorization ? 'present' : 'absent',
            contentType: req.headers['content-type'] || '',
        });
    } catch (_) {}
    next();
}

/**
 * POST /operator/user/login (optional / internal)
 * Accepts token via header/body; returns user + balance.
 */
export const operatorUserLogin = async (req, res) => {
    try {
        const resolved = await resolveByUserToken(req);
        if (resolved.error) {
            return fail(res, resolved.error.code, resolved.error.message);
        }
        const { user, wallet, token } = resolved;
        const u = userObject(user, wallet);
        logger.info('[OPERATOR] user login', { userId: u.user_id });
        return ok(res, {
            user: u,
            data: u,
            token,
            balance: u.balance,
            user_id: u.user_id,
            operator_id: u.operator_id,
        });
    } catch (error) {
        logger.error('[OPERATOR] login failed', { message: error?.message });
        return fail(res, 500, 'Internal server error');
    }
};

/**
 * GET /service/user/detail  (required for Ludo session)
 * Header: token: <USER_API_TOKEN>
 *
 * Success shape (handoff):
 * { status: true, user: { user_id, operator_id, username, balance, currency } }
 */
export const operatorUserDetail = async (req, res) => {
    try {
        const resolved = await resolveByUserToken(req);
        if (resolved.error) {
            return fail(res, resolved.error.code, resolved.error.message);
        }
        const { user, wallet } = resolved;
        const u = userObject(user, wallet);
        logger.info('[OPERATOR] user detail', { userId: u.user_id });
        return ok(res, {
            user: u,
            data: u,
        });
    } catch (error) {
        logger.error('[OPERATOR] user detail failed', { message: error?.message });
        return fail(res, 500, 'Internal server error');
    }
};

/**
 * POST /service/operator/user/balance/v2  (required for match entry debit)
 * Header: token: <USER_API_TOKEN>
 * Body: { txn_id, amount, description, txn_type: 0, ip, game_id, user_id, operator_id }
 * txn_type: 0 = debit, 1 = credit (HTTP credit optional; primary credits via RabbitMQ)
 */
export const operatorUserBalanceV2 = async (req, res) => {
    let session;
    try {
        const resolved = await resolveByUserToken(req);
        if (resolved.error) {
            return fail(res, resolved.error.code, resolved.error.message);
        }

        const body = req.body || {};
        const amountRaw = body.amount ?? body.coins ?? body.value;
        const hasAmount = amountRaw !== undefined && amountRaw !== null && String(amountRaw) !== '';

        if (!hasAmount) {
            const u = userObject(resolved.user, resolved.wallet);
            return ok(res, {
                user: u,
                data: { user_id: u.user_id, balance: u.balance, currency: 'INR' },
                balance: u.balance,
                user_id: u.user_id,
                operator_id: u.operator_id,
            });
        }

        const amount = Number(amountRaw);
        if (!Number.isFinite(amount) || amount <= 0) {
            return fail(res, 400, 'amount must be a positive number');
        }

        const txnTypeRaw = body.txn_type ?? body.type ?? body.transaction_type ?? body.action ?? 0;
        const txnTypeNum = Number(txnTypeRaw);
        const txnTypeStr = String(txnTypeRaw).trim().toLowerCase();

        let op = 'DEBIT';
        if (
            txnTypeNum === 1 ||
            ['credit', 'credit_balance', 'win', 'add', 'c'].includes(txnTypeStr)
        ) {
            op = 'CREDIT';
        } else if (
            txnTypeNum === 0 ||
            ['debit', 'debit_balance', 'bet', 'deduct', 'd', '0'].includes(txnTypeStr)
        ) {
            op = 'DEBIT';
        }

        const transactionId = String(
            body.txn_id || body.transactionId || body.transaction_id || body.ref_id || ''
        ).trim();
        if (!transactionId) {
            return fail(res, 400, 'txn_id is required for debit/credit');
        }

        // Optional body user_id must match token user when provided
        const bodyUserId = String(body.user_id || body.userId || '').trim();
        if (bodyUserId && bodyUserId !== String(resolved.user._id)) {
            return fail(res, 403, 'user_id does not match token');
        }

        const existingTx = await GapWalletTransaction.findOne({ transactionId }).lean();
        if (existingTx) {
            return ok(res, {
                balance: String(Number(existingTx.balanceAfter || 0)),
                user_id: String(resolved.user._id),
                operator_id: PLATFORM_OPERATOR_ID,
                transactionId,
                duplicate: true,
            });
        }

        const gameId = String(
            body.game_id || body.gameId || process.env.APP_OPERATOR_GAME_ID || '2'
        ).trim();
        const roundId = String(body.round_id || body.roundId || body.txn_ref_id || '').trim();

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
                        requestMeta: {
                            ip: body.ip || req.ip,
                            source: 'operator-balance-v2',
                            description: body.description || '',
                            operator_id: PLATFORM_OPERATOR_ID,
                        },
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
            balance: String(finalBalance),
            user_id: String(resolved.user._id),
            operator_id: PLATFORM_OPERATOR_ID,
            transactionId,
            type: op,
        });
    } catch (error) {
        if (error?.code === 11000) {
            const txId = String(
                (req.body || {}).txn_id || (req.body || {}).transactionId || ''
            ).trim();
            const existingTx = txId
                ? await GapWalletTransaction.findOne({ transactionId: txId }).lean()
                : null;
            return ok(res, {
                balance: String(Number(existingTx?.balanceAfter || 0)),
                transactionId: txId || null,
                duplicate: true,
            });
        }
        if (error.code === 'INSUFFICIENT_BALANCE') {
            return fail(res, 400, 'Insufficient balance', {
                balance: String(Number(error.currentBalance || 0)),
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
