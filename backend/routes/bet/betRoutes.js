import express from 'express';
import { placeBet, cancelBet, getMyBetHistory, getBetHistory, getTopWinners } from '../../controllers/betController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// User-facing: place bets (no admin auth; frontend sends userId from session)
router.post('/place', placeBet);

// User-facing: cancel bet (no admin auth; frontend sends userId from session)
router.post('/cancel', cancelBet);

// User-facing: get own bet history (no admin auth; frontend sends userId from session)
router.get('/my-history', getMyBetHistory);

// Public: show top winners in user app menu
router.get('/public/top-winners', getTopWinners);

router.get('/history', verifyAdmin, getBetHistory);
router.get('/top-winners', verifyAdmin, getTopWinners);

export default router;
