import express from 'express';
import { getUnreadNotificationCount } from '../../controllers/notificationController.js';

const router = express.Router();

router.get('/unread-count', getUnreadNotificationCount);

export default router;
