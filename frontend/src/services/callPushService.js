import { API_BASE_URL } from '../config/api';

/**
 * Web Push (VAPID) for incoming calls when site closed / phone locked — no Firebase.
 */
export async function fetchVapidPublicKey() {
  const res = await fetch(`${API_BASE_URL}/call/push/vapid-public-key`);
  const json = await res.json();
  if (!json.success || !json.data?.publicKey) {
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

  const reg = await navigator.serviceWorker.ready;
  const vapidKey = await fetchVapidPublicKey();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const subscription = sub.toJSON();
  const res = await fetch(`${API_BASE_URL}/call/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, subscription }),
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
