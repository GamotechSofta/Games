import express from 'express';
import { getAllWallets, getTransactions, getMyTransactions, adjustBalance, setBalance, getBalance } from '../../controllers/walletController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';
import { verifyUserAuth } from '../../middleware/userAuth.js';

const router = express.Router();

// Admin: list wallets, transactions, adjust (credit/debit), set balance
router.get('/all', verifyAdmin, getAllWallets);
router.get('/transactions', verifyAdmin, getTransactions);
router.post('/adjust', verifyAdmin, adjustBalance);
router.put('/set-balance', verifyAdmin, setBalance);

// User: own balance and transactions (requires player JWT)
router.get('/balance', verifyUserAuth, getBalance);
router.post('/balance', verifyUserAuth, getBalance);
router.get('/my-transactions', verifyUserAuth, getMyTransactions);
router.post('/my-transactions', verifyUserAuth, getMyTransactions);

export default router;
