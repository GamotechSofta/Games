import { FaPhoneSlash } from 'react-icons/fa';
import { useTelecallerCall, CALL_STATUS } from '../../context/TelecallerCallContext';

const statusLabel = {
    [CALL_STATUS.CALLING]: 'Calling…',
    [CALL_STATUS.IN_CALL]: 'On call',
};

/** Sticky bar shown on every tab while telecaller is on a call. */
const ActiveCallBar = () => {
    const { isBusy, activeUser, status, endCall, callError } = useTelecallerCall();

    if (!isBusy && !callError) return null;

    return (
        <div className="mb-4 space-y-2">
            {isBusy && activeUser && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-teal-500 bg-teal-50 px-4 py-3 shadow-sm">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
                            {statusLabel[status] || 'Active call'} — one call at a time
                        </p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {activeUser.name} · {activeUser.phone || '—'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={endCall}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shrink-0"
                    >
                        <FaPhoneSlash className="w-4 h-4" />
                        End call
                    </button>
                </div>
            )}
            {callError && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {callError}
                </p>
            )}
        </div>
    );
};

export default ActiveCallBar;
