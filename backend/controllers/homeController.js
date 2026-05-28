import mongoose from 'mongoose';
import Game from '../models/game.model.js';
import Market from '../models/market/market.js';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import { ensureResultsResetForNewDay } from '../utils/resultReset.js';

/** GET /api/v1/home/bootstrap */
export const getHomeBootstrap = async (req, res) => {
    try {
        await ensureResultsResetForNewDay(Market);

        const limitMarkets = Math.min(Math.max(Number.parseInt(String(req.query.marketLimit || 24), 10) || 24, 1), 100);
        const limitGames = Math.min(Math.max(Number.parseInt(String(req.query.gameLimit || 12), 10) || 12, 1), 100);

        const userIdRaw = (req.query.userId || '').toString().trim();
        const userId = mongoose.Types.ObjectId.isValid(userIdRaw) ? userIdRaw : null;

        const [markets, games] = await Promise.all([
            Market.find({
                $or: [{ marketType: 'main' }, { marketType: { $exists: false } }, { marketType: '' }],
            })
                .select('marketName startingTime closingTime showInPopular marketType betClosureTime openingNumber closingNumber winNumber')
                .sort({ startingTime: 1 })
                .limit(limitMarkets)
                .lean(),
            Game.find({ status: 'active' })
                .select('name gameId provider title image status createdAt')
                .sort({ createdAt: -1 })
                .limit(limitGames)
                .lean(),
        ]);

        let wallet = null;

        if (userId) {
            const [walletDoc, userDoc] = await Promise.all([
                Wallet.findOne({ userId }).select('balance').lean(),
                User.findById(userId).select('balance').lean(),
            ]);

            const balance = walletDoc?.balance ?? userDoc?.balance;
            if (balance != null) {
                wallet = { balance: Number(balance) };
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                markets,
                games,
                wallet,
                generatedAt: Date.now(),
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch home bootstrap' });
    }
};

