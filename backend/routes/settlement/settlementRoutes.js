import express from 'express';
import { getDailyCommissionSettlements, setDailySettlementStatus } from '../../controllers/settlementController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.get('/daily', verifyAdmin, getDailyCommissionSettlements);
router.patch('/daily-status', verifyAdmin, setDailySettlementStatus);

export default router;
