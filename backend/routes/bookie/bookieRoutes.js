import express from 'express';
import { bookieLogin, bookieHeartbeat, getReferralLink, getProfile, updateTheme, getBookieUpi, setBookieUpi } from '../../controllers/bookieController.js';
import { verifyAdmin, requireBookie } from '../../middleware/adminAuth.js';

const router = express.Router();

router.post('/login', bookieLogin);
router.post('/heartbeat', verifyAdmin, requireBookie, bookieHeartbeat);
router.get('/referral-link', verifyAdmin, requireBookie, getReferralLink);
router.get('/profile', verifyAdmin, requireBookie, getProfile);
router.patch('/theme', verifyAdmin, requireBookie, updateTheme);

// UPI ID management (bookie_collects type only)
router.get('/upi', verifyAdmin, requireBookie, getBookieUpi);
router.patch('/upi', verifyAdmin, requireBookie, setBookieUpi);

export default router;
