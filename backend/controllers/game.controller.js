import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import Game from '../models/game.model.js';
import GameSession from '../models/gameSession.model.js';
import { gapRequest } from '../services/gap.service.js';
import { generateUserToken, generateOperatorUserToken } from '../utils/jwt.js';
import logger, { sanitizeForLog } from '../utils/logger.js';

/** Validate Mongo ObjectId text. */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const DEFAULT_RETURN_URL = () =>
    `${String(process.env.FRONTEND_BASE_URL || 'https://www.aakda.in').replace(/\/$/, '')}/games`;

const POTLUDO_LAUNCH_BASE =
    process.env.LUDO_LAUNCH_BASE_URL ||
    process.env.POTLUDO_LAUNCH_URL ||
    'https://fashionbuddies.in/play/online';

const APP_OPERATOR_GAME_ID = String(process.env.APP_OPERATOR_GAME_ID || '2');

/**
 * PotLudo / fashionbuddies launch URL:
 *   https://fashionbuddies.in/play/online?id=<OPERATOR_USER_TOKEN>&game_id=2
 */
function buildPotLudoLaunchUrl(baseUrl, { operatorToken, gameId }) {
    const base = String(baseUrl || POTLUDO_LAUNCH_BASE || '').trim();
    if (!base) return '';
    let url;
    try {
        url = new URL(base.includes('://') ? base : `https://${base}`);
    } catch {
        return '';
    }
    url.search = '';
    url.hash = '';
    url.searchParams.set('id', operatorToken);
    url.searchParams.set('game_id', String(gameId || APP_OPERATOR_GAME_ID));
    return url.toString();
}

function isPotLudoGame(game) {
    const provider = String(game?.provider || '').toLowerCase();
    const launch = String(game?.launchBaseUrl || '').toLowerCase();
    const gameId = String(game?.gameId || '').trim();
    if (launch.includes('fashionbuddies.in')) return true;
    if (provider.includes('potludo') || provider.includes('fashionbuddies')) return true;
    if (gameId && gameId === APP_OPERATOR_GAME_ID) return true;
    return false;
}

/**
 * Build launch URL for self-hosted games (Spring Boot frontend on Render).
 * Pattern: {launchBaseUrl}?userId=&gameId=&sessionId=&token=&returnUrl=
 */
function buildSelfHostedLaunchUrl(launchBaseUrl, params) {
    const base = String(launchBaseUrl || '').trim();
    if (!base) return '';
    let url;
    try {
        url = new URL(base.includes('://') ? base : `https://${base}`);
    } catch {
        return '';
    }
    // Admin may paste a URL with leftover query; always rebuild params.
    url.search = '';
    url.hash = '';
    url.searchParams.set('userId', params.userId);
    url.searchParams.set('gameId', params.gameId);
    url.searchParams.set('sessionId', params.sessionId);
    if (params.token) url.searchParams.set('token', params.token);
    url.searchParams.set('returnUrl', params.returnUrl);
    return url.toString();
}

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

        const user = await User.findById(userId).select('_id phone +balance').lean();
        if (!user) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'User not found' } });
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        let wallet = await Wallet.findOne({ userId: user._id }).select('balance').lean();
        if (!wallet) {
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
        let sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        // PotLudo (fashionbuddies): id = operator user token, game_id = APP_OPERATOR_GAME_ID
        if (isPotLudoGame(game)) {
            const operatorToken = generateOperatorUserToken({
                id: String(user._id),
                phone: user.phone || '',
                gameId: APP_OPERATOR_GAME_ID,
            });
            const potludoBase =
                game.launchBaseUrl &&
                String(game.launchBaseUrl).toLowerCase().includes('fashionbuddies')
                    ? game.launchBaseUrl
                    : POTLUDO_LAUNCH_BASE;
            launchUrl = buildPotLudoLaunchUrl(potludoBase, {
                operatorToken,
                gameId: APP_OPERATOR_GAME_ID,
            });
            if (!launchUrl) {
                auditLaunch(req, 'FAILED', { responseSummary: { message: 'Invalid PotLudo launch URL' } });
                return res.status(500).json({
                    success: false,
                    message: 'Invalid PotLudo launch URL',
                });
            }
        } else if (game.launchBaseUrl) {
            const token = generateUserToken({
                id: String(user._id),
                phone: user.phone || '',
            });
            launchUrl = buildSelfHostedLaunchUrl(game.launchBaseUrl, {
                userId: String(user._id),
                gameId: payload.gameId,
                sessionId,
                token,
                returnUrl: DEFAULT_RETURN_URL(),
            });
            if (!launchUrl) {
                auditLaunch(req, 'FAILED', { responseSummary: { message: 'Invalid launchBaseUrl' } });
                return res.status(500).json({
                    success: false,
                    message: 'Invalid launchBaseUrl on game',
                });
            }
        } else {
            try {
                gapResponse = await gapRequest('/launch-game', payload);
                launchUrl = gapResponse?.launchUrl || gapResponse?.data?.launchUrl || '';
                sessionId = gapResponse?.sessionId || gapResponse?.data?.sessionId || sessionId;
            } catch (providerErr) {
                logger.warn('[GAME] GAP launch failed, using mock launch URL', { error: providerErr.message });
            }

            if (!launchUrl) {
                launchUrl = `${process.env.GAP_BASE_URL || 'https://provider-game-url.com'}/session/${sessionId}?gameId=${encodeURIComponent(payload.gameId)}&userId=${encodeURIComponent(String(user._id))}`;
            }
        }

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
        logger.error('[GAME] launch failed', { message: error?.message });
        auditLaunch(req, 'FAILED', { responseSummary: { message: 'Failed to launch game' } });
        return res.status(500).json({
            success: false,
            message: 'Failed to launch game',
        });
    }
};

/**
 * POST /api/admin/game/add
 * Body: { name, gameId, provider, status?, launchBaseUrl? }
 */
export const addGame = async (req, res) => {
    try {
        const { name, gameId, provider, status, launchBaseUrl } = req.body || {};
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
            launchBaseUrl: launchBaseUrl ? String(launchBaseUrl).trim() : '',
            status: status === 'inactive' ? 'inactive' : 'active',
            isActive: status === 'inactive' ? false : true,
        });

        return res.status(201).json({ success: true, data: game });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'gameId already exists',
            });
        }
        logger.error('[GAME] addGame failed', { message: error?.message, name: error?.name });
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to add game',
        });
    }
};

/**
 * PUT /api/admin/game/update
 * Body: { gameId, name?, provider?, status?, launchBaseUrl? }
 */
export const updateGame = async (req, res) => {
    try {
        const { gameId, name, provider, status, launchBaseUrl } = req.body || {};
        if (!gameId) {
            return res.status(400).json({
                success: false,
                message: 'gameId is required',
            });
        }

        const game = await Game.findOne({ gameId: String(gameId).trim() });
        if (!game) {
            return res.status(404).json({
                success: false,
                message: 'Game not found',
            });
        }

        if (name != null && String(name).trim()) {
            game.name = String(name).trim();
            game.title = game.name;
        }
        if (provider != null && String(provider).trim()) {
            game.provider = String(provider).trim();
        }
        if (launchBaseUrl !== undefined) {
            game.launchBaseUrl = String(launchBaseUrl || '').trim();
        }
        if (status === 'active' || status === 'inactive') {
            game.status = status;
            game.isActive = status === 'active';
        }

        await game.save();
        return res.status(200).json({ success: true, data: game });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update game',
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
