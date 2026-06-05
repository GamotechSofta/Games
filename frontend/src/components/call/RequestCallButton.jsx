import React from 'react';
import { HiOutlinePhone } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

/**
 * User taps to request a callback from telecaller team (Socket call-request).
 */
export default function RequestCallButton({ className = '' }) {
  const { requestCall, requestState, connected, isInCall } = useCall();

  if (isInCall || requestState === 'waiting') {
    return (
      <p className={`text-xs text-center text-gray-500 dark:text-gray-400 ${className}`}>
        Call in progress — use the call screen controls.
      </p>
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
