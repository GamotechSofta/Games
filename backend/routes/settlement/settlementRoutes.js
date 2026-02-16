import express from 'express';
import { getSettlements, createSettlement, updateSettlement, deleteSettlement, bookieConfirmSettlement, approveSettlement, rejectSettlement, markPaymentSent } from '../../controllers/settlementController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.get('/', verifyAdmin, getSettlements);
router.post('/', verifyAdmin, createSettlement);
router.patch('/:id', verifyAdmin, updateSettlement);
router.delete('/:id', verifyAdmin, deleteSettlement);
router.post('/:id/confirm', verifyAdmin, bookieConfirmSettlement);
router.post('/:id/payment-sent', verifyAdmin, markPaymentSent);
router.post('/:id/approve', verifyAdmin, approveSettlement);
router.post('/:id/reject', verifyAdmin, rejectSettlement);

export default router;
