import express from 'express';
import multer from 'multer';
import {
    getPaymentConfig,
    createDepositRequest,
    createWithdrawalRequest,
    getMyDeposits,
    getMyWithdrawals,
    getPayments,
    getPendingCount,
    approvePayment,
    rejectPayment,
    updatePaymentStatus,
    createPayULink,
    verifyPayUPayment,
    payuRedirect,
    getPaymentLimitsAdmin,
    updatePaymentLimits,
    getFundsHistory,
} from '../../controllers/paymentController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';

// Configure multer with memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// ===== Public APIs =====
router.get('/config', getPaymentConfig);
router.get('/payu/redirect', payuRedirect);
router.post('/payu/redirect', payuRedirect);

// ===== User APIs (no admin auth, just userId in body/query) =====
router.post('/deposit', upload.single('screenshot'), createDepositRequest);
router.post('/payu/create-link', createPayULink);
router.get('/payu/verify', verifyPayUPayment);
router.post('/payu/verify', verifyPayUPayment);
router.post('/withdraw', createWithdrawalRequest);
router.get('/my-deposits', getMyDeposits);
router.get('/my-withdrawals', getMyWithdrawals);

// ===== Admin APIs =====
router.get('/limits', verifyAdmin, getPaymentLimitsAdmin);
router.patch('/limits', verifyAdmin, updatePaymentLimits);
router.get('/funds-history', verifyAdmin, getFundsHistory);
router.get('/', verifyAdmin, getPayments);
router.get('/pending-count', verifyAdmin, getPendingCount);
router.post('/:id/approve', verifyAdmin, approvePayment);
router.post('/:id/reject', verifyAdmin, rejectPayment);
router.patch('/:id/status', verifyAdmin, updatePaymentStatus);

export default router;
