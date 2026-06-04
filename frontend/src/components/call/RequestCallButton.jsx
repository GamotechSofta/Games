import React from 'react';
import { HiOutlinePhone } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

/**
 * User taps to request a callback from telecaller team (Socket call-request).
 */
export default function RequestCallButton({ className = '' }) {
  const { requestCall, requestState, connected, endCall, isInCall } = useCall();

  if (isInCall) {
    return (
      <button
        type="button"
        onClick={endCall}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-600 bg-red-600 px-4 py-3 text-sm font-bold text-white ${className}`}
      >
        End call
      </button>
    );
  }

  if (requestState === 'waiting') {
    return (
      <div className={`rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center ${className}`}>
        <p className="text-sm font-semibold text-amber-200">Waiting for telecaller…</p>
        <p className="text-xs text-amber-200/70 mt-1">
          {connected ? 'Your request was sent. Keep this app open.' : 'Connecting…'}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestCall}
      disabled={!connected}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-teal-500 bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50 ${className}`}
    >
      <HiOutlinePhone className="h-5 w-5" />
      Request a Call
    </button>
  );
}
