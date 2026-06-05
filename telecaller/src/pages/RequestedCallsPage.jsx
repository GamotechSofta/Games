import { FaPhone, FaCircle, FaInbox } from 'react-icons/fa';
import PageHeader from '../components/layout/PageHeader';
import TurnServerBanner from '../components/call/TurnServerBanner';
import { useTelecallerCalls, CALL_STATUS } from '../hooks/useTelecallerCalls';

const statusLabel = {
    [CALL_STATUS.IDLE]: 'Ready',
    [CALL_STATUS.CALLING]: 'Calling…',
    [CALL_STATUS.IN_CALL]: 'In call',
    [CALL_STATUS.ENDED]: 'Call ended',
    [CALL_STATUS.REJECTED]: 'Call rejected',
    [CALL_STATUS.UNAVAILABLE]: 'User unavailable',
};

/** Dedicated tab: only player "Request a call" queue (not the manual player list). */
const RequestedCallsPage = () => {
    const {
        connected,
        requests,
        status,
        startCall,
        isBusy,
        callError,
    } = useTelecallerCalls();

    return (
        <>
            <PageHeader
                title="Requested calls"
                description="This tab is only for players who tapped Request a call in the app. Use Player calls for your full calling list."
            />

            <TurnServerBanner />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        connected
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-200 text-gray-600'
                    }`}
                >
                    <FaCircle className={`w-2 h-2 ${connected ? 'text-emerald-500' : 'text-gray-400'}`} />
                    {connected ? 'Live connected' : 'Connecting…'}
                </span>
                <span className="text-sm text-gray-600">
                    Pending: <strong className="text-teal-700">{requests.length}</strong>
                </span>
                <span className="text-sm text-gray-600">
                    · Status: <strong className="text-teal-700">{statusLabel[status] || status}</strong>
                </span>
                {isBusy && (
                    <span className="text-xs text-teal-700 font-medium">
                        (finish this call before starting another)
                    </span>
                )}
            </div>

            {callError && !isBusy && (
                <p className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {callError}
                </p>
            )}

            {requests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                    <FaInbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No requested calls right now</p>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                        New requests appear here automatically when a player uses Request a call on Profile or Support.
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {requests.map((req) => (
                        <li
                            key={req.id || req.userId}
                            className="bg-white rounded-xl border border-amber-200/80 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm"
                        >
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                                    Call requested
                                </p>
                                <p className="font-semibold text-gray-900">{req.name}</p>
                                <p className="text-sm text-gray-500 font-mono">{req.phone || '—'}</p>
                                {req.issue && (
                                    <p className="mt-2 text-sm text-gray-700 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                                        <span className="font-semibold text-amber-900">Issue: </span>
                                        {req.issue}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(req.createdAt).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => startCall(req)}
                                title={isBusy ? 'End your current call first' : 'Start voice call'}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaPhone className="w-4 h-4" />
                                Call Now
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
};

export default RequestedCallsPage;
