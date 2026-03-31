import mongoose from 'mongoose';
import User from '../models/user/user.js';
import Game from '../models/game.model.js';
import GameSession from '../models/gameSession.model.js';
import { gapRequest } from '../services/gap.service.js';

/** Validate Mongo ObjectId text. */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

/**
 * POST /api/game/launch
 * Body: { userId, gameId }
 */
export const launchGame = async (req, res) => {
    try {
        const { userId, gameId } = req.body || {};

        if (!userId || !gameId) {
            return res.status(400).json({
                success: false,
                message: 'userId and gameId are required',
            });
        }
        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid userId',
            });
        }

        const user = await User.findById(userId).select('_id balance').lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const game = await Game.findOne({ gameId: String(gameId).trim() }).lean();
        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found',
            });
        }
        if (game.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Game is inactive',
            });
        }

        const payload = {
            operatorId: process.env.OPERATOR_ID,
            userId: String(user._id),
            balance: Number(user.balance || 0),
            gameId: String(gameId).trim(),
        };

        console.log('[GAME] Launch request:', { userId: String(user._id), gameId: payload.gameId });
        const gapResponse = await gapRequest('/launch-game', payload);

        const launchUrl = gapResponse?.launchUrl || gapResponse?.data?.launchUrl;
        const sessionId = gapResponse?.sessionId || gapResponse?.data?.sessionId;
        if (!launchUrl || !sessionId) {
            return res.status(502).json({
                success: false,
                message: 'Invalid response from GAP launch API',
            });
        }

        // Bonus: store launch session for audit/debugging.
        await GameSession.create({
            userId: user._id,
            gameId: payload.gameId,
            sessionId: String(sessionId),
            launchUrl: String(launchUrl),
            provider: game.provider || 'GAP',
            rawResponse: gapResponse,
        });

        return res.status(200).json({
            success: true,
            launchUrl,
            sessionId,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to launch game',
        });
    }
};

/**
 * POST /api/admin/game/add
 * Body: { name, gameId, provider, status? }
 */
export const addGame = async (req, res) => {
    try {
        const { name, gameId, provider, status } = req.body || {};
        if (!name || !gameId || !provider) {
            return res.status(400).json({
                success: false,
                message: 'name, gameId and provider are required',
            });
        }

        const existing = await Game.findOne({ gameId: String(gameId).trim() }).lean();
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'gameId already exists',
            });
        }

        const game = await Game.create({
            name: String(name).trim(),
            gameId: String(gameId).trim(),
            provider: String(provider).trim(),
            status: status === 'inactive' ? 'inactive' : 'active',
        });

        return res.status(201).json({ success: true, data: game });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to add game',
        });
    }
};

/** GET /api/admin/game/list */
export const listGames = async (req, res) => {
    try {
        const games = await Game.find({}).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, data: games });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to list games',
        });
    }
};

/** GET /api/game/list - public active games for user panel */
export const listActiveGames = async (req, res) => {
    try {
        const games = await Game.find({ status: 'active' })
            .select('name gameId provider status createdAt')
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({ success: true, data: games });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to list active games',
        });
    }
};

/**
 * PUT /api/admin/game/toggle
 * Body: { gameId, status? } or { id, status? }
 */
export const toggleGame = async (req, res) => {
    try {
        const { id, gameId, status } = req.body || {};
        if (!id && !gameId) {
            return res.status(400).json({
                success: false,
                message: 'id or gameId is required',
            });
        }

        const query = id ? { _id: id } : { gameId: String(gameId).trim() };
        const game = await Game.findOne(query);
        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found',
            });
        }

        if (status === 'active' || status === 'inactive') {
            game.status = status;
        } else {
            game.status = game.status === 'active' ? 'inactive' : 'active';
        }

        await game.save();
        return res.status(200).json({ success: true, data: game });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to toggle game status',
        });
    }
};
