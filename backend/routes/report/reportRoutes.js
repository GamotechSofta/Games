import express from 'express';
import { getReport, getRevenueReport, getBookieRevenueDetail, getBookieCollectsDailyBreakdown, getBookieCommissionDaily, getAdminCollectsDailyBreakdown } from '../../controllers/reportController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.get('/', verifyAdmin, getReport);
router.get('/commission-daily', verifyAdmin, getBookieCommissionDaily);
router.get('/revenue', verifyAdmin, getRevenueReport);
router.get('/revenue/daily-breakdown', verifyAdmin, getBookieCollectsDailyBreakdown);
router.get('/revenue/admin-collects-daily', verifyAdmin, getAdminCollectsDailyBreakdown);
router.get('/revenue/:bookieId', verifyAdmin, getBookieRevenueDetail);

export default router;
