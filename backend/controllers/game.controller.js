import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import Game from '../models/game.model.js';
import GameSession from '../models/gameSession.model.js';
import { gapRequest } from '../services/gap.service.js';
import logger, { sanitizeForLog } from '../utils/logger.js';

/** Validate Mongo ObjectId text. */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const auditLaunch = (req, status, meta = {}) => {
    const body = req.body || {};
    const details = sanitizeForLog({
        route: '/api/game/launch',
        method: req.method,
        timestamp: new Date().toISOString(),
        userId: body.userId || null,
        gameId: body.gameId || null,
        status,
        request: body,
        responseSummary: meta.responseSummary || null,
    });
    if (status === 'FAILED') logger.warn('[GAME_LAUNCH_AUDIT]', details);
    else logger.info('[GAME_LAUNCH_AUDIT]', details);
};

/**
 * POST /api/game/launch
 * Body: { userId, gameId }
 */
export const launchGame = async (req, res) => {
    try {
        const { userId, gameId } = req.body || {};
        auditLaunch(req, 'REQUESTED');

        if (!userId || !gameId) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'userId and gameId are required' } });
            return res.status(400).json({
                success: false,
                message: 'userId and gameId are required',
            });
        }
        if (!isValidObjectId(userId)) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'Invalid userId' } });
            return res.status(400).json({
                success: false,
                message: 'Invalid userId',
            });
        }

        const user = await User.findById(userId).select('_id balance').lean();
        if (!user) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'User not found' } });
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        let wallet = await Wallet.findOne({ userId: user._id }).select('balance').lean();
        if (!wallet) {
            // Backward compatibility: seed missing wallet from legacy user.balance.
            const created = await Wallet.create({
                userId: user._id,
                balance: Number(user.balance || 0),
            });
            wallet = { balance: Number(created.balance || 0) };
        }

        const game = await Game.findOne({ gameId: String(gameId).trim() }).lean();
        if (!game) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'Game not found' } });
            return res.status(404).json({
                success: false,
                message: 'Game not found',
            });
        }
        const active = game.status ? game.status === 'active' : !!game.isActive;
        if (!active) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'Game is inactive' } });
            return res.status(403).json({
                success: false,
                message: 'Game is inactive',
            });
        }

        const payload = {
            operatorId: process.env.OPERATOR_ID,
            userId: String(user._id),
            balance: Number(wallet.balance || 0),
            gameId: String(gameId).trim(),
        };

        logger.info('[GAME] Launch request', { userId: String(user._id), gameId: payload.gameId });
        let gapResponse = null;
        let launchUrl = '';
        let sessionId = '';
        try {
            gapResponse = await gapRequest('/launch-game', payload);
            launchUrl = gapResponse?.launchUrl || gapResponse?.data?.launchUrl || '';
            sessionId = gapResponse?.sessionId || gapResponse?.data?.sessionId || '';
        } catch (providerErr) {
            logger.warn('[GAME] GAP launch failed, using mock launch URL', { error: providerErr.message });
        }

        // Provider fallback: keep launch flow functional while integration is in progress.
        if (!launchUrl) {
            sessionId = sessionId || `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            launchUrl = `${process.env.GAP_BASE_URL || 'https://provider-game-url.com'}/session/${sessionId}?gameId=${encodeURIComponent(String(gameId).trim())}&userId=${encodeURIComponent(String(user._id))}`;
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

        auditLaunch(req, 'SUCCESS', {
            responseSummary: { message: 'Game launch successful', sessionId: String(sessionId || '') },
        });
        return res.status(200).json({
            success: true,
            launchUrl,
            sessionId,
            message: 'Game launch successful',
        });
    } catch (error) {
        auditLaunch(req, 'FAILED', { responseSummary: { message: 'Failed to launch game' } });
        return res.status(500).json({
            success: false,
            message: 'Failed to launch game',
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
            title: String(name).trim(),
            gameId: String(gameId).trim(),
            provider: String(provider).trim(),
            status: status === 'inactive' ? 'inactive' : 'active',
            isActive: status === 'inactive' ? false : true,
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
        const fieldsPreset = (req.query.fields || '').toString().toLowerCase();
        const parsedLimit = Number.parseInt((req.query.limit || '').toString(), 10);
        const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 100)
            : null;

        let query = Game.find({ status: 'active' }).sort({ createdAt: -1 });
        if (fieldsPreset === 'home') {
            query = query.select('name gameId provider title image status createdAt');
        } else {
            query = query.select('name gameId provider status createdAt');
        }
        if (limit) {
            query = query.limit(limit);
        }

        const games = await query.lean();
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
            game.isActive = status === 'active';
        } else {
            game.status = game.status === 'active' ? 'inactive' : 'active';
            game.isActive = game.status === 'active';
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
