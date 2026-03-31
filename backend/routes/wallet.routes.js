import express from 'express';
import { debitWallet, creditWallet, getWalletTransactionById } from '../controllers/wallet.controller.js';
import rateLimit from 'express-rate-limit';
import { verifyGapSignature } from '../middleware/gapAuth.middleware.js';
import { verifyAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

const walletLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'FAILED',
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

router.post('/debit', walletLimiter, verifyGapSignature, debitWallet);
router.post('/credit', walletLimiter, verifyGapSignature, creditWallet);
router.get('/transaction/:transactionId', walletLimiter, verifyLookupAccess, getWalletTransactionById);

export default router;
