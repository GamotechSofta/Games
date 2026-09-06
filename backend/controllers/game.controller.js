import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet } from '../models/wallet/wallet.js';
import Game from '../models/game.model.js';
import GameSession from '../models/gameSession.model.js';
import { gapRequest } from '../services/gap.service.js';
import {
    launchTeenPattiSession,
    fetchEnabledGames,
} from '../services/providerHmacLaunch.service.js';
import {
    generateOperatorUserToken,
    generateGameLaunchToken,
    verifyOperatorUserToken,
} from '../utils/jwt.js';
import logger, { sanitizeForLog } from '../utils/logger.js';

/** Validate Mongo ObjectId text. */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));

const DEFAULT_RETURN_URL = () =>
    `${String(process.env.FRONTEND_BASE_URL || 'https://www.aakda.in').replace(/\/$/, '')}/games`;

const POTLUDO_LAUNCH_BASE =
    process.env.LUDO_LAUNCH_BASE_URL ||
    process.env.POTLUDO_LAUNCH_URL ||
    'https://fashionbuddies.in/play/online';

const TEENPATTI_LAUNCH_BASE =
    process.env.TEENPATTI_LAUNCH_BASE_URL ||
    process.env.DOORMART_LAUNCH_URL ||
    'https://www.doormart.shop/';

const APP_OPERATOR_GAME_ID = String(process.env.APP_OPERATOR_GAME_ID || '2');
const TEENPATTI_OPERATOR_GAME_ID = String(
    process.env.TEENPATTI_OPERATOR_GAME_ID || process.env.TEENPATTI_GAME_ID || '2',
);
const TEENPATTI_CATALOG_GAME_ID = String(
    process.env.TEENPATTI_CATALOG_GAME_ID || 'teenpatti',
);

function resolveDisplayName(user) {
    const username = String(user?.username || '').trim();
    if (username) return username;
    const composed = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (composed) return composed;
    const name = String(user?.name || '').trim();
    if (name) return name;
    const phone = String(user?.phone || '').trim();
    if (phone) return `Player ${phone.slice(-4)}`;
    return 'Player';
}

/**
 * Operator-platform launch URL (PotLudo, Teen Patti, etc.):
 *   https://your-game-client/?id=<platform_token>&game_id=2
 * Token JWT includes username + balance (same identity shared with Ludo King).
 */
function buildOperatorPlatformLaunchUrl(baseUrl, { operatorToken, gameId }) {
    const base = String(baseUrl || '').trim();
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
    if (launch.includes('fashionbuddies.in')) return true;
    if (provider.includes('potludo') || provider.includes('fashionbuddies')) return true;
    return false;
}

function isTeenPattiGame(game) {
    const provider = String(game?.provider || '').toLowerCase();
    const launch = String(game?.launchBaseUrl || '').toLowerCase();
    const gameId = String(game?.gameId || '').trim().toLowerCase();
    if (launch.includes('doormart.shop')) return true;
    if (
        provider.includes('teenpatti') ||
        provider.includes('doormart') ||
        provider.includes('teen_patti')
    ) {
        return true;
    }
    if (gameId === TEENPATTI_CATALOG_GAME_ID.toLowerCase() || gameId === 'teenpatti') {
        return true;
    }
    return false;
}

function resolveOperatorLaunchBase(game) {
    const configured = String(game?.launchBaseUrl || '').trim();
    if (isPotLudoGame(game)) {
        if (configured && configured.toLowerCase().includes('fashionbuddies')) return configured;
        return POTLUDO_LAUNCH_BASE;
    }
    if (isTeenPattiGame(game)) {
        if (configured && configured.toLowerCase().includes('doormart')) return configured;
        return TEENPATTI_LAUNCH_BASE;
    }
    return configured;
}

function resolveOperatorLaunchGameId(game) {
    if (isTeenPattiGame(game)) return TEENPATTI_OPERATOR_GAME_ID;
    if (isPotLudoGame(game)) return APP_OPERATOR_GAME_ID;
    return String(game?.gameId || APP_OPERATOR_GAME_ID);
}

/**
 * Self-hosted / Spring Ludo King launch URL with full player identity.
 *   ?userId&username&name&balance&currency&phone&gameId&sessionId&token&returnUrl
 *   + aliases id / game_id (PotLudo-compatible)
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
    url.search = '';
    url.hash = '';

    url.searchParams.set('userId', params.userId);
    url.searchParams.set('username', params.username);
    url.searchParams.set('name', params.username);
    url.searchParams.set('balance', String(params.balance));
    url.searchParams.set('currency', params.currency || 'INR');
    if (params.phone) url.searchParams.set('phone', params.phone);
    url.searchParams.set('gameId', params.gameId);
    url.searchParams.set('sessionId', params.sessionId);
    if (params.token) {
        url.searchParams.set('token', params.token);
        url.searchParams.set('id', params.token);
    }
    url.searchParams.set('game_id', params.gameId);
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
 * Resolve logged-in user id from Bearer token (preferred) or body.userId.
 */
function resolveLaunchUserId(req) {
    const auth = String(req.headers.authorization || '');
    if (auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim();
        const decoded = verifyOperatorUserToken(token);
        if (decoded?.id) return String(decoded.id);
    }
    return String(req.body?.userId || '').trim();
}

/**
 * POST /api/game/launch
 *
 * Thin proxy to the provider HMAC launch API:
 *   POST {PROVIDER_BASE_URL}{PROVIDER_LAUNCH_PATH}
 *   Headers: X-API-Key, X-Timestamp, X-Signature
 *   Body: { operatorId, playerId, playerUsername, gameCode, currency }
 *
 * Browser must not call the provider directly (API_SECRET stays server-side).
 * Auth: Bearer user token
 * Body: { gameCode }
 */
export const launchGame = async (req, res) => {
    try {
        const { gameId, gameCode } = req.body || {};
        auditLaunch(req, 'REQUESTED');

        const userId = resolveLaunchUserId(req);
        const code = String(gameCode || gameId || '').trim().toUpperCase();

        if (!userId) {
            auditLaunch(req, 'FAILED', {
                responseSummary: { message: 'Authorization token is required' },
            });
            return res.status(401).json({
                success: false,
                message: 'Authorization token is required',
            });
        }
        if (!code) {
            auditLaunch(req, 'FAILED', {
                responseSummary: { message: 'gameCode is required' },
            });
            return res.status(400).json({
                success: false,
                message: 'gameCode is required',
            });
        }
        if (!isValidObjectId(userId)) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'Invalid user' } });
            return res.status(400).json({
                success: false,
                message: 'Invalid user',
            });
        }

        const user = await User.findById(userId)
            .select('_id username phone firstName lastName name isActive')
            .lean();
        if (!user) {
            auditLaunch(req, 'FAILED', { responseSummary: { message: 'User not found' } });
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: 'Account suspended',
            });
        }

        const playerUsername = resolveDisplayName(user);

        // Real launch = PROVIDER_BASE_URL + PROVIDER_LAUNCH_PATH (HMAC-signed)
        const providerLaunch = await launchTeenPattiSession({
            playerId: String(user._id),
            playerUsername,
            gameCode: code,
            currency: 'INR',
        });

        const sessionId =
            providerLaunch.sessionId ||
            `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        await GameSession.create({
            userId: user._id,
            gameId: code,
            sessionId: String(sessionId),
            launchUrl: String(providerLaunch.launchUrl),
            provider: 'provider',
            rawResponse: providerLaunch.raw,
        });

        auditLaunch(req, 'SUCCESS', {
            responseSummary: {
                message: 'Provider launch successful',
                sessionId: String(sessionId),
                gameCode: code,
                playerUsername,
            },
        });
        return res.status(200).json({
            success: true,
            launchUrl: providerLaunch.launchUrl,
            sessionId,
            message: 'Game launch successful',
        });
    } catch (error) {
        logger.error('[GAME] launch failed', {
            message: error?.message,
            status: error?.status,
        });
        auditLaunch(req, 'FAILED', {
            responseSummary: { message: error?.message || 'Failed to launch game' },
        });
        const status = 502;
        return res.status(status).json({
            success: false,
            message: error?.message || 'Failed to launch game',
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
 * GET /api/game/enabled
 * Proxies provider:
 *   GET {OPERATOR_GAMES}?operatorId={OPERATOR_ID}
 */
export const listProviderEnabledGames = async (req, res) => {
    try {
        const result = await fetchEnabledGames();
        return res.status(200).json({
            success: true,
            operatorId: result.operatorId,
            data: result.games,
        });
    } catch (error) {
        logger.error('[GAME] enabled-games failed', {
            message: error?.message,
            status: error?.status,
        });
        return res.status(error?.status && error.status >= 400 ? error.status : 502).json({
            success: false,
            message: error?.message || 'Failed to load provider games',
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
