import { API_BASE_URL } from '../config/api';

/**
 * Web Push (VAPID) for incoming calls when site closed / phone locked — no Firebase.
 */

export async function waitForServiceWorker(timeoutMs = 15000) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker not supported');
  }
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready;
  }
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Service worker not ready — reload the app once')), timeoutMs);
    }),
  ]);
}

export async function fetchVapidPublicKey() {
  const res = await fetch(`${API_BASE_URL}/call/push/vapid-public-key`);
  const json = await res.json();
  if (!json.success || !json.data?.publicKey) {
    throw new Error('Call alerts not configured on server (admin must set WEB_PUSH_VAPID_* keys)');
  }
  if (!json.data.configured) {
    throw new Error('Call alerts not configured on server');
  }
  return json.data.publicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function subscribeToCallPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported on this browser');
  }
  if (Notification.permission === 'denied') {
    throw new Error('Notifications blocked — enable them in browser settings');
  }
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notification permission denied');
  }

  await waitForServiceWorker();
  const reg = await navigator.serviceWorker.ready;

  try {
    await reg.update();
  } catch (_) {}

  const vapidKey = await fetchVapidPublicKey();
  const appServerKey = urlBase64ToUint8Array(vapidKey);

  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const existingKey = sub.options?.applicationServerKey;
    let needsResubscribe = !existingKey;
    if (existingKey && existingKey.byteLength) {
      const a = new Uint8Array(existingKey);
      const b = appServerKey;
      needsResubscribe = a.length !== b.length || a.some((v, i) => v !== b[i]);
    }
    if (needsResubscribe) {
      await sub.unsubscribe();
      sub = null;
    }
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey,
    });
  }

  const subscription = sub.toJSON();
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const res = await fetch(`${API_BASE_URL}/call/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, subscription, appOrigin }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to enable call alerts');

  localStorage.setItem('callPushEnabled', '1');
  return subscription;
}

export function isCallPushEnabledLocally() {
  return localStorage.getItem('callPushEnabled') === '1';
}

export async function fetchPendingCall(callId, userId) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await fetch(`${API_BASE_URL}/call/pending/${callId}${q}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Call not found');
  return json.data;
}

export async function rejectPendingCallApi(callId, userId) {
  await fetch(`${API_BASE_URL}/call/reject-pending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callId, userId }),
  });
}
