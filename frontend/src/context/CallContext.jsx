import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  connectUserCallSocket,
  disconnectUserCallSocket,
  registerUser,
  emitCallRequest,
  getCallSocket,
} from '../services/callSocketService';
import {
  createPeerConnection,
  getLocalAudioStream,
  attachLocalStream,
  createAnswer,
  addIceCandidate,
  closePeerConnection,
  playRemoteAudio,
  stopRemoteAudio,
  prepareRemoteAudioElement,
} from '../services/webrtcService';
import { getRtcConfiguration } from '../services/iceConfigService';
import {
  subscribeToCallPush,
  fetchPendingCall,
  fetchMyPendingCall,
  rejectPendingCallApi,
  isCallPushActive,
  verifyCallPushSubscription,
} from '../services/callPushService';
import {
  getIosCallSetupStep,
  isIosCallReady,
} from '../services/iosCallSetup';
import {
  isIosDevice,
  isStandalonePwa,
} from '../services/callNotificationService';
import {
  isNotificationGranted,
  showIncomingCallNotification,
} from '../services/callNotificationService';
import { startCallRingtone, stopCallRingtone } from '../services/callRingtoneService';
import { startCallDelayTone, stopCallDelayTone } from '../services/callDelayToneService';

const CallContext = createContext(null);

function getIncomingCallIdFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('incomingCall');
}

function clearIncomingCallUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('incomingCall')) return;
  url.searchParams.delete('incomingCall');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

function readUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CallProvider({ children, enabled }) {
  const [connected, setConnected] = useState(false);
  const [requestState, setRequestState] = useState('idle'); // idle | waiting | in-call
  const [incoming, setIncoming] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(false);
  const [pushError, setPushError] = useState('');

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const telecallerIdRef = useRef(null);
  const pendingIceRef = useRef([]);
  const prewarmStreamRef = useRef(null);
  const incomingRef = useRef(null);
  const callStatusRef = useRef('idle');

  const stopPrewarmMic = useCallback(() => {
    prewarmStreamRef.current?.getTracks().forEach((t) => t.stop());
    prewarmStreamRef.current = null;
  }, []);

  const getUserIds = useCallback(() => {
    const u = readUser();
    const userId = String(u?.id || u?._id || '').trim();
    const name = u?.username || u?.name || 'Player';
    const phone = u?.phone || u?.mobile || '';
    return { userId, name, phone };
  }, []);

  const cleanupCall = useCallback(() => {
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    stopRemoteAudio();
    stopCallRingtone();
    stopCallDelayTone();
    telecallerIdRef.current = null;
    pendingIceRef.current = [];
    stopPrewarmMic();
  }, [stopPrewarmMic]);

  const endCall = useCallback(() => {
    const { userId } = getUserIds();
    const to = telecallerIdRef.current;
    if (userId && to) {
      getCallSocket()?.emit('end-call', { from: userId, to });
    }
    cleanupCall();
    incomingRef.current = null;
    setIncoming(null);
    setCallStatus('ended');
    setRequestState('idle');
    setTimeout(() => setCallStatus('idle'), 1500);
  }, [cleanupCall, getUserIds]);

  const openIncomingFromServer = useCallback((data) => {
    if (!data?.offer || !data?.from) return;
    if (incomingRef.current && callStatusRef.current === 'ringing') return;

    telecallerIdRef.current = data.from;
    pendingIceRef.current = [];
    const callerName = data.callerName || 'Aakda.in';
    const payload = {
      callId: data.callId,
      from: data.from,
      offer: data.offer,
      callerName,
    };

    incomingRef.current = payload;
    callStatusRef.current = 'ringing';
    startCallRingtone();

    setIncoming(payload);
    setRequestState('incoming');
    setCallStatus('ringing');

    showIncomingCallNotification({
      callId: data.callId,
      callerName,
    }).catch(() => {});
  }, []);

  const rejectIncoming = useCallback(() => {
    const { userId } = getUserIds();
    const from = incoming?.from;
    const callId = incoming?.callId;
    if (callId && userId) {
      rejectPendingCallApi(callId, userId).catch(() => {});
    }
    if (userId && from) {
      getCallSocket()?.emit('reject-call', { from: userId, to: from });
    }
    incomingRef.current = null;
    setIncoming(null);
    setCallStatus('rejected');
    setRequestState('idle');
    setTimeout(() => setCallStatus('idle'), 1500);
  }, [incoming, getUserIds]);

  const acceptIncoming = useCallback(async () => {
    const inc = incoming;
    const { userId } = getUserIds();
    if (!inc?.offer || !userId || !inc.from) return;

    try {
      setCallStatus('connecting');
      telecallerIdRef.current = inc.from;
      prepareRemoteAudioElement();

      const stream = prewarmStreamRef.current || await getLocalAudioStream();
      prewarmStreamRef.current = null;
      localStreamRef.current = stream;

      const pc = await createPeerConnection({
        onIceCandidate: (candidate) => {
          getCallSocket()?.emit('ice-candidate', {
            from: userId,
            to: inc.from,
            candidate,
          });
        },
        onRemoteTrack: (streamOrTrack) => {
          stopCallDelayTone();
          playRemoteAudio(streamOrTrack);
          setCallStatus('in-call');
          setRequestState('in-call');
        },
        onConnectionState: (state) => {
          if (state === 'failed' || state === 'closed') {
            endCall();
          }
        },
      });
      pcRef.current = pc;
      attachLocalStream(pc, stream);

      const answer = await createAnswer(pc, inc.offer);
      getCallSocket()?.emit('answer-call', {
        from: userId,
        to: inc.from,
        answer,
      });
      await Promise.all(
        pendingIceRef.current.map((c) => addIceCandidate(pc, c)),
      );
      pendingIceRef.current = [];
      incomingRef.current = null;
      setIncoming(null);
    } catch (err) {
      console.error('[call] accept failed', err);
      rejectIncoming();
    }
  }, [incoming, getUserIds, endCall, rejectIncoming]);

  const requestCall = useCallback(() => {
    const { userId, name, phone } = getUserIds();
    if (!userId) return;
    emitCallRequest({ userId, name, phone });
    setRequestState('waiting');
    setCallStatus('waiting');
  }, [getUserIds]);

  useEffect(() => {
    if (enabled) getRtcConfiguration().catch(() => {});
  }, [enabled]);

  /** Play ringtone while incoming call UI is shown. */
  useEffect(() => {
    if (incoming && callStatus === 'ringing') {
      startCallRingtone();
    } else {
      stopCallRingtone();
    }
    return () => stopCallRingtone();
  }, [incoming, callStatus]);

  /** Hold/connecting tone after Accept until telecaller voice is live. */
  useEffect(() => {
    if (callStatus === 'connecting') {
      startCallDelayTone();
    } else {
      stopCallDelayTone();
    }
    return () => stopCallDelayTone();
  }, [callStatus]);

  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  /** Prewarm remote audio while ringing — mic waits until Accept (avoids killing ringtone). */
  useEffect(() => {
    if (!incoming) {
      stopPrewarmMic();
      return undefined;
    }
    getRtcConfiguration().catch(() => {});
    prepareRemoteAudioElement();
    return undefined;
  }, [incoming, stopPrewarmMic]);

  const pollForPendingCall = useCallback(async () => {
    const { userId } = getUserIds();
    if (!userId) return;
    if (incomingRef.current && callStatusRef.current === 'ringing') return;
    if (callStatusRef.current === 'in-call' || callStatusRef.current === 'connecting') return;

    try {
      const data = await fetchMyPendingCall(userId);
      if (data?.offer && data?.from) {
        openIncomingFromServer(data);
      }
    } catch (_) {}
  }, [getUserIds, openIncomingFromServer]);

  useEffect(() => {
    if (!enabled) {
      disconnectUserCallSocket();
      return undefined;
    }

    const socket = connectUserCallSocket();
    if (!socket) return undefined;

    const { userId, name, phone } = getUserIds();
    if (!userId) return undefined;

    const onConnect = () => {
      setConnected(true);
      registerUser(userId, name, phone);
      void pollForPendingCall();
    };

    const onIncoming = (data) => {
      openIncomingFromServer(data);
    };

    const onEnded = ({ from }) => {
      if (from !== telecallerIdRef.current) return;
      cleanupCall();
      incomingRef.current = null;
      setIncoming(null);
      setCallStatus('ended');
      setRequestState('idle');
    };

    const onIce = async ({ from, candidate }) => {
      if (from !== telecallerIdRef.current || !candidate) return;
      if (!pcRef.current) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await addIceCandidate(pcRef.current, candidate);
      } catch (_) {}
    };

    socket.on('connect', onConnect);
    socket.on('incoming-call', onIncoming);
    socket.on('call-ended', onEnded);
    socket.on('ice-candidate', onIce);
    socket.on('call-request-ack', () => {
      setRequestState('waiting');
    });

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('incoming-call', onIncoming);
      socket.off('call-ended', onEnded);
      socket.off('ice-candidate', onIce);
      disconnectUserCallSocket();
      cleanupCall();
    };
  }, [enabled, getUserIds, cleanupCall, openIncomingFromServer, pollForPendingCall]);

  /** Recover missed socket events (iOS background / flaky mobile data). */
  useEffect(() => {
    if (!enabled) return undefined;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pollForPendingCall();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void pollForPendingCall();
      }
    }, 5000);

    void pollForPendingCall();

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      clearInterval(interval);
    };
  }, [enabled, pollForPendingCall]);

  const syncPushAlertsState = useCallback(async () => {
    const active = await isCallPushActive();
    setPushAlertsEnabled(active);
    return active;
  }, []);

  const enableCallAlerts = useCallback(async () => {
    const { userId } = getUserIds();
    if (!userId) return;
    setPushError('');

    if (isIosDevice() && !isStandalonePwa()) {
      setPushError('Add Aakda to your Home Screen first (Safari → Share → Add to Home Screen), then open from that icon.');
      return;
    }

    try {
      await subscribeToCallPush(userId);
      setPushAlertsEnabled(true);
    } catch (err) {
      setPushError(err.message || 'Could not enable call alerts');
      setPushAlertsEnabled(await verifyCallPushSubscription() && isNotificationGranted());
    }
  }, [getUserIds]);

  /** Sync + re-register push (iOS PWA needs this after reinstall / iOS updates). */
  useEffect(() => {
    if (!enabled) return undefined;
    const { userId } = getUserIds();
    if (!userId) return undefined;

    let cancelled = false;

    const sync = async () => {
      const active = await isCallPushActive();
      if (cancelled) return;
      setPushAlertsEnabled(active);

      if (isNotificationGranted() && isStandalonePwa()) {
        try {
          await subscribeToCallPush(userId);
          if (!cancelled) setPushAlertsEnabled(true);
        } catch (_) {
          if (!cancelled) await syncPushAlertsState();
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [enabled, getUserIds, syncPushAlertsState]);

  useEffect(() => {
    if (!enabled) return undefined;
    const { userId } = getUserIds();
    if (!userId) return undefined;

    const loadFromCallId = async (callId) => {
      try {
        const data = await fetchPendingCall(callId, userId);
        openIncomingFromServer({
          callId: data.callId,
          from: data.from,
          offer: data.offer,
          callerName: data.callerName,
        });
        clearIncomingCallUrl();
      } catch (err) {
        console.warn('[call] pending load failed', err);
      }
    };

    const callId = getIncomingCallIdFromUrl();
    if (callId) loadFromCallId(callId);

    const onSwMessage = (event) => {
      if (event.data?.type === 'incoming-call-open' && event.data.callId) {
        loadFromCallId(event.data.callId);
        return;
      }
      if (event.data?.type === 'incoming-call-push') {
        void pollForPendingCall();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    if (pushAlertsEnabled && isNotificationGranted()) {
      subscribeToCallPush(userId).catch(() => {});
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [enabled, getUserIds, openIncomingFromServer, pushAlertsEnabled, pollForPendingCall]);

  const value = {
    connected,
    requestState,
    callStatus,
    incoming,
    requestCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
    isInCall: callStatus === 'in-call',
    pushAlertsEnabled,
    pushError,
    enableCallAlerts,
    iosCallReady: isIosCallReady(pushAlertsEnabled),
    iosCallSetupStep: getIosCallSetupStep({ pushAlertsEnabled }),
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
