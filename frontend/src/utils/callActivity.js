const ACTIVE_CALL_STATUSES = new Set(['ringing', 'connecting', 'in-call', 'ended', 'rejected']);

export function isCallSupportRoute(pathname = '') {
  const path = String(pathname || '');
  return path === '/profile' || path.startsWith('/support');
}

export function hasIncomingCallUrlParam() {
  if (typeof window === 'undefined') return false;
  return Boolean(new URLSearchParams(window.location.search).get('incomingCall'));
}

export function isActiveCallStatus(callStatus) {
  return ACTIVE_CALL_STATUSES.has(callStatus);
}

/**
 * Attach call socket listeners + register user with signaling server.
 */
export function shouldEnableCallSignals({
  enabled,
  pathname,
  requestState,
  callStatus,
  pushAlertsEnabled,
}) {
  if (!enabled) return false;
  if (isCallSupportRoute(pathname)) return true;
  if (requestState && requestState !== 'idle') return true;
  if (isActiveCallStatus(callStatus)) return true;
  if (hasIncomingCallUrlParam()) return true;
  if (pushAlertsEnabled) return true;
  return false;
}

/**
 * HTTP poll for missed incoming calls — only when a callback is likely.
 */
export function shouldPollForPendingCall({
  signalsEnabled,
  requestState,
  callStatus,
  pushAlertsEnabled,
}) {
  if (!signalsEnabled) return false;
  if (requestState === 'waiting') return true;
  if (callStatus === 'ringing' || callStatus === 'connecting') return true;
  if (hasIncomingCallUrlParam()) return true;
  if (pushAlertsEnabled && callStatus === 'idle' && requestState === 'idle') return true;
  return false;
}
