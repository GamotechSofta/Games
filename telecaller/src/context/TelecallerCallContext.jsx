import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
} from 'react';
import { useCallRequests } from './CallRequestsContext';
import {
    createPeerConnection,
    getLocalAudioStream,
    attachLocalStream,
    createOffer,
    applyAnswer,
    addIceCandidate,
    closePeerConnection,
    playRemoteAudio,
    stopRemoteAudio,
} from '../services/webrtcService';

export const CALL_STATUS = {
    IDLE: 'idle',
    CALLING: 'calling',
    IN_CALL: 'in-call',
    ENDED: 'ended',
    REJECTED: 'rejected',
    UNAVAILABLE: 'unavailable',
};

const TelecallerCallContext = createContext(null);

/**
 * App-wide: one active call per telecaller (persists across sidebar tabs).
 */
export function TelecallerCallProvider({ children }) {
    const {
        emitCallUser,
        emitIce,
        emitEndCall,
        telecallerId,
        onSignaling,
    } = useCallRequests();

    const [status, setStatus] = useState(CALL_STATUS.IDLE);
    const [activeUser, setActiveUser] = useState(null);
    const [callError, setCallError] = useState('');
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteUserIdRef = useRef(null);
    const pendingIceRef = useRef([]);

    const isBusy = status === CALL_STATUS.CALLING || status === CALL_STATUS.IN_CALL;

    const cleanup = useCallback(() => {
        closePeerConnection(pcRef.current);
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        stopRemoteAudio();
        remoteUserIdRef.current = null;
        pendingIceRef.current = [];
    }, []);

    const endCall = useCallback(() => {
        const to = remoteUserIdRef.current;
        if (to && telecallerId) {
            emitEndCall({ from: telecallerId, to });
        }
        cleanup();
        setStatus(CALL_STATUS.ENDED);
        setActiveUser(null);
        setTimeout(() => setStatus(CALL_STATUS.IDLE), 1500);
    }, [telecallerId, emitEndCall, cleanup]);

    const startCall = useCallback(async (request) => {
        if (!request?.userId || !telecallerId) return;
        if (isBusy) {
            setCallError('You are already on a call. End it before starting another.');
            return;
        }

        setCallError('');
        cleanup();
        setStatus(CALL_STATUS.CALLING);
        setActiveUser(request);
        remoteUserIdRef.current = request.userId;

        try {
            const stream = await getLocalAudioStream();
            localStreamRef.current = stream;

            const pc = await createPeerConnection({
                onIceCandidate: (candidate) => {
                    emitIce({
                        from: telecallerId,
                        to: request.userId,
                        candidate,
                    });
                },
                onRemoteTrack: (streamOrTrack) => {
                    playRemoteAudio(streamOrTrack);
                    setStatus(CALL_STATUS.IN_CALL);
                },
                onConnectionState: (state) => {
                    if (state === 'failed' || state === 'closed') {
                        endCall();
                    }
                },
            });
            pcRef.current = pc;
            attachLocalStream(pc, stream);

            const offer = await createOffer(pc);
            emitCallUser({
                from: telecallerId,
                to: request.userId,
                offer,
                callerName: 'Aakda.in',
            });
        } catch (err) {
            console.error('[call] start failed', err);
            cleanup();
            setStatus(CALL_STATUS.UNAVAILABLE);
            setActiveUser(null);
            setCallError(err.message || 'Could not start call');
        }
    }, [telecallerId, emitCallUser, emitIce, cleanup, endCall, isBusy]);

    useEffect(() => {
        const onAnswered = async ({ from, answer }) => {
            if (from !== remoteUserIdRef.current || !pcRef.current || !answer) return;
            try {
                await applyAnswer(pcRef.current, answer);
                for (const candidate of pendingIceRef.current) {
                    await addIceCandidate(pcRef.current, candidate);
                }
                pendingIceRef.current = [];
                setStatus(CALL_STATUS.IN_CALL);
            } catch (e) {
                console.error('[call] answer failed', e);
                endCall();
            }
        };

        const onRejected = ({ from }) => {
            if (from !== remoteUserIdRef.current) return;
            cleanup();
            setStatus(CALL_STATUS.REJECTED);
            setActiveUser(null);
            setCallError('Player declined the call');
            setTimeout(() => {
                setStatus(CALL_STATUS.IDLE);
                setCallError('');
            }, 2000);
        };

        const onIce = async ({ from, candidate }) => {
            if (from !== remoteUserIdRef.current || !candidate) return;
            if (!pcRef.current) {
                pendingIceRef.current.push(candidate);
                return;
            }
            try {
                await addIceCandidate(pcRef.current, candidate);
            } catch (_) {}
        };

        const onEnded = ({ from }) => {
            if (from !== remoteUserIdRef.current) return;
            cleanup();
            setStatus(CALL_STATUS.ENDED);
            setActiveUser(null);
            setTimeout(() => setStatus(CALL_STATUS.IDLE), 1500);
        };

        const onUnavailable = ({ userId }) => {
            if (userId !== remoteUserIdRef.current) return;
            cleanup();
            setStatus(CALL_STATUS.UNAVAILABLE);
            setActiveUser(null);
            setCallError('Player is offline — they may still get a notification');
            setTimeout(() => {
                setStatus(CALL_STATUS.IDLE);
                setCallError('');
            }, 3000);
        };

        const onCallBusy = ({ message }) => {
            cleanup();
            setStatus(CALL_STATUS.IDLE);
            setActiveUser(null);
            setCallError(message || 'You are already on another call');
        };

        const onUserBusy = ({ message }) => {
            cleanup();
            setStatus(CALL_STATUS.IDLE);
            setActiveUser(null);
            setCallError(message || 'This player is already on a call');
        };

        onSignaling('call-answered', onAnswered);
        onSignaling('call-rejected', onRejected);
        onSignaling('ice-candidate', onIce);
        onSignaling('call-ended', onEnded);
        onSignaling('user-unavailable', onUnavailable);
        onSignaling('call-busy', onCallBusy);
        onSignaling('user-busy', onUserBusy);

        return () => {
            onSignaling('call-answered', null);
            onSignaling('call-rejected', null);
            onSignaling('ice-candidate', null);
            onSignaling('call-ended', null);
            onSignaling('user-unavailable', null);
            onSignaling('call-busy', null);
            onSignaling('user-busy', null);
        };
    }, [onSignaling, cleanup, endCall]);

    const value = {
        status,
        activeUser,
        startCall,
        endCall,
        isBusy,
        callError,
        clearCallError: () => setCallError(''),
    };

    return (
        <TelecallerCallContext.Provider value={value}>
            {children}
        </TelecallerCallContext.Provider>
    );
}

export function useTelecallerCall() {
    const ctx = useContext(TelecallerCallContext);
    if (!ctx) {
        throw new Error('useTelecallerCall must be used within TelecallerCallProvider');
    }
    return ctx;
}
