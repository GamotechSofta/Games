/**
 * Show system notification when call arrives but app is backgrounded / phone locked.
 * Web Push handles fully-closed tabs; this covers socket delivery while screen is off.
 */

function isAppInBackground() {
  if (typeof document === 'undefined') return true;
  return document.hidden || !document.hasFocus();
}

export async function showIncomingCallNotification({ callId, callerName }) {
  if (!callId || !isAppInBackground()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const title = 'Aakda.in is calling';
  const body = `${callerName || 'Support'} wants to talk to you`;
  const url = `/?incomingCall=${callId}`;
  const options = {
    body,
    icon: '/favIcon.png',
    badge: '/favIcon.png',
    tag: `incoming-call-${callId}`,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400],
    data: {
      type: 'incoming-call',
      callId,
      callerName: callerName || 'Aakda.in',
      url,
    },
    actions: [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' },
    ],
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return;
    }
  } catch (err) {
    console.warn('[call] SW notification failed', err);
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  } catch (err) {
    console.warn('[call] Notification failed', err);
  }
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}
