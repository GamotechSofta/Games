import webpush from 'web-push';
import PushSubscription from '../models/push/pushSubscription.js';

let vapidReady = false;

function initVapid() {
    if (vapidReady) return true;
    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.WEB_PUSH_SUBJECT?.trim() || 'mailto:support@aakda.in';
    if (!publicKey || !privateKey) return false;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidReady = true;
    return true;
}

export function getVapidPublicKey() {
    return process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || '';
}

export function isWebPushConfigured() {
    return Boolean(
        process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim()
        && process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim(),
    );
}

/**
 * Ring user's devices via Web Push (works when site closed / phone locked on supported browsers).
 */
export async function sendIncomingCallPush({ userId, callId, callerName, openUrl }) {
    if (!initVapid()) {
        console.warn('[push] VAPID keys missing — set WEB_PUSH_VAPID_* in .env (run: node scripts/generateVapidKeys.js)');
        return { sent: 0, failed: 0 };
    }

    const subs = await PushSubscription.find({ userId }).lean();
    if (!subs.length) return { sent: 0, failed: 0 };

    const payload = JSON.stringify({
        title: 'Aakda.in is calling',
        body: `${callerName || 'Support'} wants to talk to you`,
        tag: `incoming-call-${callId}`,
        data: {
            type: 'incoming-call',
            callId,
            userId: String(userId),
            callerName: callerName || 'Aakda.in',
            url: openUrl,
        },
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(subs.map(async (sub) => {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                },
                payload,
                { TTL: 60, urgency: 'high' },
            );
            sent += 1;
        } catch (err) {
            failed += 1;
            if (err.statusCode === 404 || err.statusCode === 410) {
                await PushSubscription.deleteOne({ _id: sub._id });
            }
        }
    }));

    return { sent, failed };
}
