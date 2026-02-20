/**
 * Simple event emitter for app-level events (replaces window.dispatchEvent in RN).
 */
const listeners = {};

export function emit(eventName) {
  (listeners[eventName] || []).forEach((fn) => { try { fn(); } catch (_) {} });
}

export function on(eventName, fn) {
  if (!listeners[eventName]) listeners[eventName] = [];
  listeners[eventName].push(fn);
  return () => {
    listeners[eventName] = (listeners[eventName] || []).filter((f) => f !== fn);
  };
}
