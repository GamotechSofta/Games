import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { useAuth } from './AuthContext';
import {
    connectCallSocket,
    disconnectCallSocket,
    getCallSocket,
    registerTelecaller,
} from '../services/callSocketService';
import { getRtcConfiguration } from '../services/iceConfigService';

const CallRequestsContext = createContext(null);

/**
 * App-wide socket for player "Request a call" queue (stays connected on all tabs).
 */
export function CallRequestsProvider({ children }) {
    const { session } = useAuth();
    const [connected, setConnected] = useState(false);
    const [requests, setRequests] = useState([]);
    const handlersRef = useRef({});

    const telecallerId = session?.id || session?._id;
    const telecallerName = session?.username || session?.phone || 'Telecaller';

    const onSignaling = useCallback((event, handler) => {
        if (handler) handlersRef.current[event] = handler;
        else delete handlersRef.current[event];
    }, []);

    useEffect(() => {
        if (!telecallerId) {
            disconnectCallSocket();
            setConnected(false);
            setRequests([]);
            return undefined;
        }

        getRtcConfiguration().catch(() => {});

        const socket = connectCallSocket();

        const onConnect = () => {
            setConnected(true);
            registerTelecaller(telecallerId, telecallerName);
        };

        const onDisconnect = () => setConnected(false);

        const onPending = (list) => {
            setRequests(Array.isArray(list) ? list : []);
        };

        const onNew = (req) => {
            setRequests((prev) => {
                const filtered = prev.filter((r) => r.userId !== req.userId);
                return [...filtered, req];
            });
        };

        const onRemoved = ({ userId }) => {
            setRequests((prev) => prev.filter((r) => r.userId !== userId));
        };

        const wrap = (event) => (payload) => {
            handlersRef.current[event]?.(payload);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('pending-call-requests', onPending);
        socket.on('new-call-request', onNew);
        socket.on('call-request-removed', onRemoved);
        socket.on('call-answered', wrap('call-answered'));
        socket.on('call-rejected', wrap('call-rejected'));
        socket.on('ice-candidate', wrap('ice-candidate'));
        socket.on('call-ended', wrap('call-ended'));
        socket.on('user-unavailable', wrap('user-unavailable'));
        socket.on('call-busy', wrap('call-busy'));
        socket.on('user-busy', wrap('user-busy'));

        if (socket.connected) onConnect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('pending-call-requests', onPending);
            socket.off('new-call-request', onNew);
            socket.off('call-request-removed', onRemoved);
            socket.off('call-answered', wrap('call-answered'));
            socket.off('call-rejected', wrap('call-rejected'));
            socket.off('ice-candidate', wrap('ice-candidate'));
            socket.off('call-ended', wrap('call-ended'));
            socket.off('user-unavailable', wrap('user-unavailable'));
            socket.off('call-busy', wrap('call-busy'));
            socket.off('user-busy', wrap('user-busy'));
        };
    }, [telecallerId, telecallerName]);

    const emitCallUser = useCallback((payload) => {
        getCallSocket()?.emit('call-user', payload);
    }, []);

    const emitIce = useCallback((payload) => {
        getCallSocket()?.emit('ice-candidate', payload);
    }, []);

    const emitEndCall = useCallback((payload) => {
        getCallSocket()?.emit('end-call', payload);
    }, []);

    const value = {
        connected,
        requests,
        requestCount: requests.length,
        onSignaling,
        emitCallUser,
        emitIce,
        emitEndCall,
        telecallerId: String(telecallerId || ''),
    };

    return (
        <CallRequestsContext.Provider value={value}>
            {children}
        </CallRequestsContext.Provider>
    );
}

export function useCallRequests() {
    const ctx = useContext(CallRequestsContext);
    if (!ctx) {
        throw new Error('useCallRequests must be used within CallRequestsProvider');
    }
    return ctx;
}
