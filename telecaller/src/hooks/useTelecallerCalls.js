import { useState, useCallback, useRef, useEffect } from 'react';
import { useCallRequests } from '../context/CallRequestsContext';
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

/**
 * Combined socket + outbound WebRTC for telecaller live calls page.
 */
export function useTelecallerCalls() {
    const socketApi = useCallRequests();
    const {
        connected,
        requests,
        emitCallUser,
        emitIce,
        emitEndCall,
        telecallerId,
        onSignaling,
    } = socketApi;

    const [status, setStatus] = useState(CALL_STATUS.IDLE);
    const [activeUser, setActiveUser] = useState(null);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteUserIdRef = useRef(null);

    const cleanup = useCallback(() => {
        closePeerConnection(pcRef.current);
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        stopRemoteAudio();
        remoteUserIdRef.current = null;
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
        cleanup();
        setStatus(CALL_STATUS.CALLING);
        setActiveUser(request);
        remoteUserIdRef.current = request.userId;

        try {
            const stream = await getLocalAudioStream();
            localStreamRef.current = stream;

            const pc = createPeerConnection({
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
                    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
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
                callerName: 'Telecaller',
            });
        } catch (err) {
            console.error('[call] start failed', err);
            cleanup();
            setStatus(CALL_STATUS.UNAVAILABLE);
            setActiveUser(null);
        }
    }, [telecallerId, emitCallUser, emitIce, cleanup, endCall]);

    // Signaling from user → telecaller
    useEffect(() => {
        const onAnswered = async ({ from, answer }) => {
            if (from !== remoteUserIdRef.current || !pcRef.current || !answer) return;
            try {
                await applyAnswer(pcRef.current, answer);
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
            setTimeout(() => setStatus(CALL_STATUS.IDLE), 2000);
        };

        const onIce = async ({ from, candidate }) => {
            if (from !== remoteUserIdRef.current || !pcRef.current) return;
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

        const onUnavailable = () => {
            if (!remoteUserIdRef.current) return;
            cleanup();
            setStatus(CALL_STATUS.UNAVAILABLE);
            setActiveUser(null);
            setTimeout(() => setStatus(CALL_STATUS.IDLE), 2000);
        };

        onSignaling('call-answered', onAnswered);
        onSignaling('call-rejected', onRejected);
        onSignaling('ice-candidate', onIce);
        onSignaling('call-ended', onEnded);
        onSignaling('user-unavailable', onUnavailable);

        return () => {
            onSignaling('call-answered', null);
            onSignaling('call-rejected', null);
            onSignaling('ice-candidate', null);
            onSignaling('call-ended', null);
            onSignaling('user-unavailable', null);
        };
    }, [onSignaling, cleanup, endCall]);

    const isBusy = status === CALL_STATUS.CALLING || status === CALL_STATUS.IN_CALL;

    return {
        connected,
        requests,
        status,
        activeUser,
        startCall,
        endCall,
        isBusy,
    };
}
