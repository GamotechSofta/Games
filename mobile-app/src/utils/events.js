/**
 * Simple event emitter for app-level events (replaces window.dispatchEvent in RN).
 * Events:
 *   'userLogin'       – user logged in, reload profile
 *   'userLogout'      – user logged out, clear profile
 *   'balanceUpdated'  – only balance changed, no need to reload full profile
 *   'notificationsSeen' – notification count changed
 */
const listeners = {};

export function emit(eventName, payload) {
  (listeners[eventName] || []).forEach((fn) => { try { fn(payload); } catch (_) { } });
}

export function on(eventName, fn) {
  if (!listeners[eventName]) listeners[eventName] = [];
  listeners[eventName].push(fn);
  return () => {
    listeners[eventName] = (listeners[eventName] || []).filter((f) => f !== fn);
  };
}
