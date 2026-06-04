import { useCallRequests } from '../context/CallRequestsContext';

/** @deprecated Use useCallRequests from CallRequestsContext */
export function useCallSocket() {
    return useCallRequests();
}
