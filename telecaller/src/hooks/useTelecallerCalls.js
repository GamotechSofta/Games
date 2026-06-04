import { useCallRequests } from '../context/CallRequestsContext';
import { useTelecallerCall, CALL_STATUS } from '../context/TelecallerCallContext';

export { CALL_STATUS };

/** Request queue + single active call (from TelecallerCallProvider). */
export function useTelecallerCalls() {
    const { connected, requests } = useCallRequests();
    const call = useTelecallerCall();

    return {
        connected,
        requests,
        ...call,
    };
}
