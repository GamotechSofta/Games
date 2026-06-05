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

function defaultPlayerBaseUrl() {
    return (process.env.FRONTEND_BASE_URL || 'https://aakda.in').replace(/\/$/, '');
}

function buildOpenUrl(callId, appOrigin) {
    const base = (appOrigin || defaultPlayerBaseUrl()).replace(/\/$/, '');
    return `${base}/?incomingCall=${callId}`;
}

/** Web Push Topic header: max 32 URL/filename-safe chars (RFC 8030). */
function pushTopicForCall(callId) {
    return String(callId || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 32);
}

/**
 * Ring user's devices via Web Push (works when site closed / phone locked on supported browsers).
 */
export async function sendIncomingCallPush({ userId, callId, callerName }) {
    if (!initVapid()) {
        console.warn('[push] VAPID keys missing — set WEB_PUSH_VAPID_* in .env (run: npm run generate-vapid)');
        return { sent: 0, failed: 0, skipped: 'no-vapid' };
    }

    const subs = await PushSubscription.find({ userId }).lean();
    if (!subs.length) {
        console.warn(`[push] No subscriptions for user ${userId} — player must tap "Enable call alerts"`);
        return { sent: 0, failed: 0, skipped: 'no-subs' };
    }

    let sent = 0;
    let failed = 0;

    await Promise.all(subs.map(async (sub) => {
        const openUrl = buildOpenUrl(callId, sub.appOrigin);
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

        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                },
                payload,
                {
                    TTL: 120,
                    urgency: 'high',
                    topic: pushTopicForCall(callId),
                },
            );
            sent += 1;
        } catch (err) {
            failed += 1;
            console.warn('[push] send failed:', err.statusCode || err.message);
            if (err.statusCode === 404 || err.statusCode === 410) {
                await PushSubscription.deleteOne({ _id: sub._id });
            }
        }
    }));

    if (sent > 0) {
        console.log(`[push] incoming call ${callId} → ${sent} device(s)`);
    }

    return { sent, failed };
}
