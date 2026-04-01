import express from 'express';
import { walletBalance, debitWallet, creditWallet, rollbackWallet, getWalletTransactionById } from '../controllers/wallet.controller.js';
import rateLimit from 'express-rate-limit';
import { verifyGapSignature } from '../middleware/gapAuth.middleware.js';
import { verifyAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'wallet-api-ok',
    });
});

const walletLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: Number(process.env.GAP_WALLET_RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
        success: false,
        status: 'FAILED',
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please retry shortly.',
    },
});

// Security for transaction lookup: allow admin auth OR shared secret header.
const verifyLookupAccess = async (req, res, next) => {
    const headerSecret = String(req.headers['x-gap-secret'] || '').trim();
    const expectedSecret = String(process.env.GAP_LOOKUP_SECRET || '').trim();
    if (expectedSecret && headerSecret && headerSecret === expectedSecret) {
        return next();
    }
    return verifyAdmin(req, res, next);
};

router.post('/balance', walletLimiter, verifyGapSignature, walletBalance);
router.post('/debit', walletLimiter, verifyGapSignature, debitWallet);
router.post('/credit', walletLimiter, verifyGapSignature, creditWallet);
router.post('/rollback', walletLimiter, verifyGapSignature, rollbackWallet);
router.get('/transaction/:transactionId', walletLimiter, verifyLookupAccess, getWalletTransactionById);

export default router;
