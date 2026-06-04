/* eslint-disable no-restricted-globals */
/**
 * PWA service worker: caching + incoming call Web Push (no Firebase).
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const API_BASE = self.location.origin.includes('localhost')
  ? `${self.location.origin}/api/v1`
  : `${self.location.origin}/api/v1`;

async function rejectPendingCall(callId, userId) {
  try {
    await fetch(`${API_BASE}/call/reject-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId, userId }),
    });
  } catch (_) {}
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch (_) {
      payload = { title: 'Aakda.in is calling', body: event.data?.text() || '' };
    }

    const title = payload.title || 'Aakda.in is calling';
    const body = payload.body || 'Tap to answer';
    const data = payload.data || {};

    await self.registration.showNotification(title, {
      body,
      icon: '/favIcon.png',
      badge: '/favIcon.png',
      tag: payload.tag || 'incoming-call',
      requireInteraction: true,
      vibrate: [400, 150, 400, 150, 400],
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ],
      data,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const callId = data.callId;
  const userId = data.userId;

  if (event.action === 'decline') {
    event.waitUntil(rejectPendingCall(callId, userId));
    return;
  }

  const url = data.url || (callId ? `/?incomingCall=${callId}` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'incoming-call-open', callId, url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
