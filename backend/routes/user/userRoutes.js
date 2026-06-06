import express from 'express';
import rateLimit from 'express-rate-limit';
import { createUser, userLogin, userSignup, userHeartbeat, getUsers, getSingleUser, togglePlayerStatus, deletePlayer, clearLoginDevices, changePlayerPassword } from '../../controllers/userController.js';
import { sendUserOtp, verifyUserOtp, resendUserOtp } from '../../controllers/otpController.js';
import { getMyProfile } from '../../controllers/userProfileController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';
import { verifyUserAuth } from '../../middleware/userAuth.js';

const router = express.Router();

const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many OTP requests. Please try again later.' },
});

const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many verification attempts. Please try again later.' },
});

// Public routes
router.post('/otp/send', otpSendLimiter, sendUserOtp);
router.post('/otp/verify', otpVerifyLimiter, verifyUserOtp);
router.post('/otp/resend', otpSendLimiter, resendUserOtp);
router.post('/login', userLogin);
router.post('/signup', userSignup);
router.post('/heartbeat', userHeartbeat);
router.get('/me', verifyUserAuth, getMyProfile);

// Admin/Bookie routes
router.get('/', verifyAdmin, getUsers);
router.get('/:id', verifyAdmin, getSingleUser);
router.post('/create', verifyAdmin, createUser);
router.patch('/:id/toggle-status', verifyAdmin, togglePlayerStatus);
router.patch('/:id/password', verifyAdmin, changePlayerPassword);
router.delete('/:id', verifyAdmin, deletePlayer);
router.patch('/:id/clear-devices', verifyAdmin, clearLoginDevices);

export default router;
