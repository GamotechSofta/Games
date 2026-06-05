import express from 'express';
import {
    getIceConfig,
    getPushVapidKey,
    subscribeWebPush,
    unsubscribeWebPush,
    getPendingIncomingCall,
    getMyPendingCall,
    rejectPendingCall,
    cancelCallRequest,
} from '../../controllers/callController.js';

const router = express.Router();

router.get('/ice-config', getIceConfig);
router.get('/push/vapid-public-key', getPushVapidKey);
router.post('/push/subscribe', subscribeWebPush);
router.post('/push/unsubscribe', unsubscribeWebPush);
router.get('/pending/:callId', getPendingIncomingCall);
router.get('/pending-user/:userId', getMyPendingCall);
router.post('/reject-pending', rejectPendingCall);
router.post('/cancel-request', cancelCallRequest);

export default router;
