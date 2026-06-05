import React from 'react';
import { HiOutlinePhone, HiOutlineX } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

/**
 * Request callback — stays on Profile; full-screen popup only when telecaller rings.
 */
export default function RequestCallButton({ className = '' }) {
  const {
    requestCall,
    cancelCallRequest,
    requestState,
    connected,
    isInCall,
    isCallOverlayOpen,
  } = useCall();

  if (isInCall || isCallOverlayOpen) {
    return (
      <p className={`text-xs text-center text-teal-600 dark:text-teal-400 ${className}`}>
        Call active — use the call screen.
      </p>
    );
  }

  if (requestState === 'waiting') {
    return (
      <div
        className={`rounded-2xl border border-teal-500/35 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600/20">
            <span className="absolute inset-0 rounded-full border-2 border-teal-400/40 animate-ping" />
            <HiOutlinePhone className="relative h-5 w-5 text-teal-600 dark:text-teal-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Request sent</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              A telecaller will call you shortly. Stay on this page — the call popup will appear automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cancelCallRequest}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 dark:border-white/15 dark:bg-white/5 dark:text-gray-200"
        >
          <HiOutlineX className="h-4 w-4" />
          Cancel request
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestCall}
      disabled={!connected}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none ${className}`}
    >
      <HiOutlinePhone className="h-5 w-5" />
      Request a Call
    </button>
  );
}
