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
} from '../services/webrtcService';
import {
  subscribeToCallPush,
  fetchPendingCall,
  rejectPendingCallApi,
  isCallPushEnabledLocally,
} from '../services/callPushService';

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
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(() => isCallPushEnabledLocally());
  const [pushError, setPushError] = useState('');

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const telecallerIdRef = useRef(null);

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
    telecallerIdRef.current = null;
  }, []);

  const endCall = useCallback(() => {
    const { userId } = getUserIds();
    const to = telecallerIdRef.current;
    if (userId && to) {
      getCallSocket()?.emit('end-call', { from: userId, to });
    }
    cleanupCall();
    setIncoming(null);
    setCallStatus('ended');
    setRequestState('idle');
    setTimeout(() => setCallStatus('idle'), 1500);
  }, [cleanupCall, getUserIds]);

  const openIncomingFromServer = useCallback((data) => {
    if (!data?.offer || !data?.from) return;
    setIncoming({
      callId: data.callId,
      from: data.from,
      offer: data.offer,
      callerName: data.callerName || 'Aakda.in',
    });
    setRequestState('incoming');
    setCallStatus('ringing');
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
      const stream = await getLocalAudioStream();
      localStreamRef.current = stream;
      telecallerIdRef.current = inc.from;

      const pc = await createPeerConnection({
        onIceCandidate: (candidate) => {
          getCallSocket()?.emit('ice-candidate', {
            from: userId,
            to: inc.from,
            candidate,
          });
        },
        onRemoteTrack: (streamOrTrack) => {
          playRemoteAudio(streamOrTrack);
          setCallStatus('in-call');
          setRequestState('in-call');
        },
        onConnectionState: (state) => {
          if (state === 'disconnected' || state === 'failed' || state === 'closed') {
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
    };

    const onIncoming = (data) => {
      openIncomingFromServer(data);
    };

    const onEnded = ({ from }) => {
      if (from !== telecallerIdRef.current) return;
      cleanupCall();
      setIncoming(null);
      setCallStatus('ended');
      setRequestState('idle');
    };

    const onIce = async ({ from, candidate }) => {
      if (from !== telecallerIdRef.current || !pcRef.current) return;
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
  }, [enabled, getUserIds, cleanupCall, openIncomingFromServer]);

  const enableCallAlerts = useCallback(async () => {
    const { userId } = getUserIds();
    if (!userId) return;
    setPushError('');
    try {
      await subscribeToCallPush(userId);
      setPushAlertsEnabled(true);
    } catch (err) {
      setPushError(err.message || 'Could not enable call alerts');
    }
  }, [getUserIds]);

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
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    if (pushAlertsEnabled && Notification.permission === 'granted') {
      subscribeToCallPush(userId).catch(() => {});
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [enabled, getUserIds, openIncomingFromServer, pushAlertsEnabled]);

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
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
