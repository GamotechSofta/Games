import mongoose from 'mongoose';
import Bet from '../models/bet/bet.js';
import User from '../models/user/user.js';
import Market from '../models/market/market.js';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';
import { isBettingAllowed } from '../utils/marketTiming.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';

const VALID_BET_TYPES = ['single', 'jodi', 'panna', 'half-sangam', 'full-sangam'];
const THREE_DIGITS = /^\d{3}$/;

const normalizeBetOn = (v) => {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return null;
    if (s === 'open') return 'open';
    if (s === 'close' || s === 'closed') return 'close';
    if (s === 'o') return 'open';
    if (s === 'c') return 'close';
    if (s === 'openbet') return 'open';
    if (s === 'closebet') return 'close';
    // Also accept UI strings
    if (s === 'open ') return 'open';
    if (s === 'close ') return 'close';
    return null;
};

/**
 * Place bets (user-facing). Body: { userId, marketId, bets: [ { betType, betNumber, amount } ] }
 * Deducts total amount from wallet, creates Bet records. Returns new balance.
 */
export const placeBet = async (req, res) => {
    try {
        const { userId, marketId, bets, scheduledDate } = req.body;

        if (!userId || !marketId || !Array.isArray(bets) || bets.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'userId, marketId and non-empty bets array are required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }
        if (!mongoose.Types.ObjectId.isValid(marketId)) {
            return res.status(400).json({ success: false, message: 'Invalid marketId' });
        }

        const user = await User.findById(userId).select('isActive').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact admin.',
                code: 'ACCOUNT_SUSPENDED',
            });
        }

        const market = await Market.findById(marketId).lean();
        if (!market) {
            return res.status(404).json({ success: false, message: 'Market not found' });
        }

        // Determine default session for bets (open vs close).
        // For main markets: if opening is declared, bets are "close" session; else "open".
        // For startline: single result market; treat as "open".
        const defaultBetOn =
            market?.marketType === 'startline'
                ? 'open'
                : (market?.openingNumber && THREE_DIGITS.test(String(market.openingNumber)) ? 'close' : 'open');

        // If scheduling for a future date (tomorrow or later in IST), skip today's betting-window check
        let isSchedulingForFuture = false;
        const todayIST = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
        if (scheduledDate) {
            // Prefer string comparison for YYYY-MM-DD to avoid timezone parsing issues
            const schedStr = String(scheduledDate).trim().slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(schedStr) && schedStr > todayIST) {
                isSchedulingForFuture = true;
            } else {
                const sched = new Date(scheduledDate);
                if (!isNaN(sched.getTime())) {
                    const schedIST = new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    }).format(sched);
                    if (schedIST > todayIST) isSchedulingForFuture = true;
                }
            }
        }
        if (!isSchedulingForFuture) {
            const timing = isBettingAllowed(market);
            if (!timing.allowed) {
                return res.status(400).json({
                    success: false,
                    message: timing.message || 'Betting is not allowed for this market at this time.',
                    code: 'BETTING_CLOSED',
                });
            }
        }

        const sanitized = [];
        let totalAmount = 0;
        for (const b of bets) {
            const betType = (b.betType || '').toString().trim().toLowerCase();
            const betNumber = (b.betNumber || '').toString().trim();
            const amount = Number(b.amount);
            const betOnOverride =
                normalizeBetOn(b.betOn) ||
                normalizeBetOn(b.session) ||
                // some UI code may send `type: 'OPEN' | 'CLOSE'`
                normalizeBetOn(b.type);
            const betOn = betOnOverride || defaultBetOn;
            if (!VALID_BET_TYPES.includes(betType) || !betNumber || !Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Each bet must have betType, betNumber and amount > 0',
                });
            }
            totalAmount += amount;
            sanitized.push({ betType, betNumber, amount, betOn });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
            await wallet.save();
        }

        if (wallet.balance < totalAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Required: ₹${totalAmount}, Available: ₹${wallet.balance}`,
            });
        }

        wallet.balance -= totalAmount;
        await wallet.save();

        // Validate scheduledDate if provided
        let scheduledDateObj = null;
        let isScheduled = false;
        if (scheduledDate) {
            scheduledDateObj = new Date(scheduledDate);
            if (isNaN(scheduledDateObj.getTime())) {
                wallet.balance += totalAmount;
                await wallet.save();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid scheduledDate format',
                });
            }
            // Ensure scheduled date is in the future
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            scheduledDateObj.setHours(0, 0, 0, 0);
            if (scheduledDateObj < now) {
                wallet.balance += totalAmount;
                await wallet.save();
                return res.status(400).json({
                    success: false,
                    message: 'Scheduled date must be today or in the future',
                });
            }
            isScheduled = true;
        }

        const betIds = [];
        const createdBets = [];
        try {
            for (const { betType, betNumber, amount, betOn } of sanitized) {
                const bet = await Bet.create({
                    userId,
                    marketId,
                    betOn,
                    betType,
                    betNumber,
                    amount,
                    status: 'pending',
                    payout: 0,
                    scheduledDate: scheduledDateObj,
                    isScheduled: isScheduled,
                });
                betIds.push(bet._id);
                createdBets.push(bet);
            }
        } catch (createErr) {
            wallet.balance += totalAmount;
            await wallet.save();
            throw createErr;
        }

        const labelForType = (t) => {
            const s = String(t || '').toLowerCase();
            if (s === 'single') return 'Single Ank';
            if (s === 'jodi') return 'Digit';
            if (s === 'panna') return 'Panna';
            if (s === 'half-sangam') return 'Half Sangam';
            if (s === 'full-sangam') return 'Full Sangam';
            return 'Bet';
        };

        try {
            if (createdBets.length > 0) {
                await WalletTransaction.insertMany(
                    createdBets.map((b) => ({
                        userId,
                        type: 'debit',
                        amount: Number(b.amount) || 0,
                        description: `Bet placed – ${market.marketName} (${labelForType(b.betType)} ${String(b.betNumber || '').trim()})`,
                        referenceId: b._id.toString(),
                    }))
                );
            }
        } catch (txErr) {
            wallet.balance += totalAmount;
            await wallet.save();
            throw txErr;
        }

        res.status(201).json({
            success: true,
            message: 'Bet placed successfully',
            data: {
                newBalance: wallet.balance,
                betIds,
                totalAmount,
            },
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid id format for user or market' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message || 'Validation failed' });
        }
        console.error('[placeBet]', error.message || error);
        res.status(500).json({ success: false, message: error.message || 'Failed to place bet' });
    }
};

/**
 * Get bet history for current user (user-facing).
 * Query params: userId (required)
 */
export const getMyBetHistory = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }

        // Get user's bets from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const bets = await Bet.find({
            userId,
            createdAt: { $gte: thirtyDaysAgo }
        })
            .populate({ path: 'marketId', select: 'marketName closingTime marketType', model: Market })
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        res.status(200).json({ success: true, data: bets });
    } catch (error) {
        console.error('[getMyBetHistory]', error.message || error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch bet history' });
    }
};

export const getBetHistory = async (req, res) => {
    try {
        const { userId, marketId, status, startDate, endDate } = req.query;
        const query = {};

        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
            if (userId) {
                const ids = bookieUserIds.map((id) => id.toString());
                if (ids.includes(userId)) query.userId = userId;
            }
        } else if (userId) {
            query.userId = userId;
        }
        if (marketId) query.marketId = marketId;
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const bets = await Bet.find(query)
            .populate('userId', 'username email')
            .populate({ path: 'marketId', select: 'marketName marketType', model: Market })
            .sort({ createdAt: -1 })
            .limit(1000);

        res.status(200).json({ success: true, data: bets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Cancel a bet (user-facing). Body: { userId, betId }
 * Rules:
 * 1. Bet can be cancelled within 30 minutes of placing it
 * 2. Bet can be cancelled only if it's at least 30 minutes before market closing time
 * 3. Only pending bets can be cancelled
 */
export const cancelBet = async (req, res) => {
    try {
        const { userId, betId } = req.body;

        if (!userId || !betId) {
            return res.status(400).json({
                success: false,
                message: 'userId and betId are required',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(betId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId or betId' });
        }

        // Find the bet
        const bet = await Bet.findById(betId);
        if (!bet) {
            return res.status(404).json({ success: false, message: 'Bet not found' });
        }

        // Verify the bet belongs to the user
        if (bet.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to cancel this bet' });
        }

        // Check if bet is already cancelled or settled
        if (bet.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Bet is already cancelled' });
        }

        if (bet.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending bets can be cancelled',
            });
        }

        // Get market details
        const market = await Market.findById(bet.marketId).lean();
        if (!market) {
            return res.status(404).json({ success: false, message: 'Market not found' });
        }

        const now = new Date();
        const betPlacedAt = new Date(bet.createdAt);
        const timeSinceBetPlaced = (now - betPlacedAt) / 1000 / 60; // minutes

        // Rule 1: Check if within 30 minutes of placing bet
        if (timeSinceBetPlaced > 30) {
            return res.status(400).json({
                success: false,
                message: 'Bet can only be cancelled within 30 minutes of placing it',
                code: 'CANCELLATION_TIMEOUT',
            });
        }

        // Rule 2: Check if at least 30 minutes before market closing
        const closeStr = (market?.closingTime || '').toString().trim();
        if (!closeStr) {
            return res.status(400).json({
                success: false,
                message: 'Market timing not configured',
            });
        }

        // Calculate closing time in IST
        const getTodayIST = () => {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date());
        };

        const normalizeTimeStr = (timeStr) => {
            const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
            return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
        };

        const parseISTDateTime = (isoStr) => {
            const d = new Date(isoStr);
            return isNaN(d.getTime()) ? null : d.getTime();
        };

        const todayIST = getTodayIST();
        const openAt = parseISTDateTime(`${todayIST}T00:00:00+05:30`);
        let closeAt = parseISTDateTime(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);

        if (closeAt <= openAt) {
            const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
            baseDate.setDate(baseDate.getDate() + 1);
            const nextDayStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(baseDate);
            closeAt = parseISTDateTime(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
        }

        const timeUntilClosing = (closeAt - now.getTime()) / 1000 / 60; // minutes

        if (timeUntilClosing < 30) {
            return res.status(400).json({
                success: false,
                message: 'Bet cannot be cancelled within 30 minutes of market closing time',
                code: 'TOO_CLOSE_TO_CLOSING',
            });
        }

        // All checks passed, proceed with cancellation
        bet.status = 'cancelled';
        await bet.save();

        // Refund amount to user's wallet
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        wallet.balance += bet.amount;
        await wallet.save();

        // Create wallet transaction for refund
        const labelForType = (t) => {
            const s = String(t || '').toLowerCase();
            if (s === 'single') return 'Single Ank';
            if (s === 'jodi') return 'Digit';
            if (s === 'panna') return 'Panna';
            if (s === 'half-sangam') return 'Half Sangam';
            if (s === 'full-sangam') return 'Full Sangam';
            return 'Bet';
        };

        await WalletTransaction.create({
            userId,
            type: 'credit',
            amount: bet.amount,
            description: `Bet cancelled – ${market.marketName} (${labelForType(bet.betType)} ${String(bet.betNumber || '').trim()})`,
            referenceId: bet._id.toString(),
        });

        // Log for admin: bet cancelled by user (so admin panel / logs show the update)
        const userDoc = await User.findById(userId).select('username').lean();
        const username = userDoc?.username || userId.toString();
        await logActivity({
            action: 'bet_cancelled',
            performedBy: username,
            performedByType: 'user',
            targetType: 'bet',
            targetId: bet._id.toString(),
            details: `Bet cancelled – ${market.marketName} (${labelForType(bet.betType)} ${String(bet.betNumber || '').trim()}) – Refunded ₹${bet.amount}`,
            meta: { userId, marketId: bet.marketId.toString(), amount: bet.amount, betNumber: bet.betNumber, betType: bet.betType },
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Bet cancelled successfully and amount refunded',
            data: {
                newBalance: wallet.balance,
                refundedAmount: bet.amount,
            },
        });
    } catch (error) {
        console.error('[cancelBet]', error.message || error);
        res.status(500).json({ success: false, message: error.message || 'Failed to cancel bet' });
    }
};

export const getTopWinners = async (req, res) => {
    try {
        const { timeRange } = req.query;
        const dateFilter = {};
        const bookieUserIds = await getBookieUserIds(req.admin);

        if (timeRange === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateFilter.createdAt = { $gte: today };
        } else if (timeRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter.createdAt = { $gte: weekAgo };
        } else if (timeRange === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter.createdAt = { $gte: monthAgo };
        }

        const matchStage = { status: 'won', ...dateFilter };
        if (bookieUserIds !== null) {
            matchStage.userId = { $in: bookieUserIds };
        }

        const winners = await Bet.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$userId',
                    totalWins: { $sum: 1 },
                    totalWinnings: { $sum: '$payout' },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    userId: {
                        _id: '$user._id',
                        username: '$user.username',
                        email: '$user.email',
                    },
                    totalWins: 1,
                    totalWinnings: 1,
                },
            },
            { $sort: { totalWinnings: -1 } },
            { $limit: 50 },
        ]);

        // Calculate win rate
        const winnersWithRate = await Promise.all(
            winners.map(async (winner) => {
                const totalBets = await Bet.countDocuments({ userId: winner._id, ...dateFilter });
                const winRate = totalBets > 0 ? ((winner.totalWins / totalBets) * 100).toFixed(2) : 0;
                return { ...winner, winRate };
            })
        );

        res.status(200).json({ success: true, data: winnersWithRate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
