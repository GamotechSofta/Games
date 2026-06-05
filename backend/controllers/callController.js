import mongoose from 'mongoose';
import { getIceServerConfig } from '../config/iceServers.js';
import {
    getVapidPublicKey,
    isWebPushConfigured,
} from '../services/callPushService.js';
import PushSubscription from '../models/push/pushSubscription.js';
import {
    getPendingCall,
    getPendingCallForUser,
    removePendingCall,
} from '../socket/pendingCallStore.js';
import { routeCallEventToUser } from '../socket/callSocket.js';

export const getIceConfig = async (req, res) => {
    try {
        const { iceServers, turnConfigured, source } = await getIceServerConfig();
        res.status(200).json({
            success: true,
            data: {
                iceServers,
                turnConfigured,
                source,
                /** 'all' = try direct/STUN first, TURN as fallback (faster connect than relay-only) */
                iceTransportPolicy: 'all',
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to load ICE configuration',
        });
    }
};

export const getPushVapidKey = (req, res) => {
    const publicKey = getVapidPublicKey();
    res.status(200).json({
        success: true,
        data: {
            publicKey,
            configured: isWebPushConfigured(),
        },
    });
};

/** Save browser Web Push subscription (no Firebase). */
export const subscribeWebPush = async (req, res) => {
    try {
        const userId = String(req.body?.userId || req.user?._id || '').trim();
        const subscription = req.body?.subscription;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return res.status(400).json({ success: false, message: 'Invalid push subscription' });
        }

        const appOrigin = String(req.body?.appOrigin || '').trim().replace(/\/$/, '');

        await PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            {
                userId,
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
                userAgent: req.headers['user-agent'] || '',
                platform: 'web',
                appOrigin,
            },
            { upsert: true, new: true },
        );

        res.status(200).json({ success: true, message: 'Call alerts enabled' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const unsubscribeWebPush = async (req, res) => {
    try {
        const endpoint = String(req.body?.endpoint || '').trim();
        if (!endpoint) {
            return res.status(400).json({ success: false, message: 'endpoint required' });
        }
        await PushSubscription.deleteOne({ endpoint });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** Fetch stored offer after opening app from push notification. */
export const getPendingIncomingCall = async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = String(req.query.userId || '').trim();
        const entry = getPendingCall(callId);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Call expired or not found' });
        }
        if (userId && entry.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Not your call' });
        }
        res.status(200).json({
            success: true,
            data: {
                callId: entry.callId,
                from: entry.from,
                callerName: entry.callerName,
                offer: entry.offer,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** Active pending call for user (poll from mobile background). */
export const getMyPendingCall = async (req, res) => {
    try {
        const userId = String(req.params.userId || '').trim();
        const entry = getPendingCallForUser(userId);
        if (!entry) {
            return res.status(200).json({ success: true, data: null });
        }
        res.status(200).json({
            success: true,
            data: {
                callId: entry.callId,
                from: entry.from,
                callerName: entry.callerName,
                offer: entry.offer,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/** Decline from notification while app/site closed. */
export const rejectPendingCall = async (req, res) => {
    try {
        const { callId, userId } = req.body || {};
        const entry = removePendingCall(callId);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'Call not found' });
        }
        if (userId && String(entry.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        routeCallEventToUser(entry.from, 'call-rejected', {
            from: entry.userId,
            to: entry.from,
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
