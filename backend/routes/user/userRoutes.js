import express from 'express';
import { createUser, userLogin, userSignup, userHeartbeat, getUsers, getSingleUser, togglePlayerStatus, deletePlayer, clearLoginDevices, changePlayerPassword } from '../../controllers/userController.js';
import { getMyProfile, sendOtp, verifyOtp } from '../../controllers/otpAuthController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';
import { verifyUserAuth } from '../../middleware/userAuth.js';

const router = express.Router();

// Public routes
router.post('/login', userLogin);
router.post('/signup', userSignup);
router.post('/heartbeat', userHeartbeat);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
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
