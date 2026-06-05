import React, { useState } from 'react';
import { HiOutlinePhone, HiOutlineX } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

const MAX_ISSUE_LEN = 500;

/**
 * Request callback with issue description — stays on Profile until telecaller rings.
 */
export default function RequestCallButton({ className = '' }) {
  const {
    requestCall,
    cancelCallRequest,
    requestState,
    requestIssue,
    requestError,
    connected,
    isInCall,
    isCallOverlayOpen,
  } = useCall();

  const [issue, setIssue] = useState('');
  const [localError, setLocalError] = useState('');

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
              A telecaller will call you shortly. The call popup will appear automatically.
            </p>
            {requestIssue && (
              <p className="mt-2 rounded-lg bg-white/70 dark:bg-black/25 px-2.5 py-2 text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
                <span className="font-semibold text-gray-900 dark:text-white">Your issue: </span>
                {requestIssue}
              </p>
            )}
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

  const submit = () => {
    const trimmed = issue.trim();
    if (trimmed.length < 5) {
      setLocalError('Please describe your issue (at least 5 characters)');
      return;
    }
    setLocalError('');
    requestCall(trimmed);
  };

  const displayError = localError || requestError;

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label
          htmlFor="call-request-issue"
          className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300"
        >
          Describe your issue
        </label>
        <textarea
          id="call-request-issue"
          rows={3}
          maxLength={MAX_ISSUE_LEN}
          value={issue}
          onChange={(e) => {
            setIssue(e.target.value);
            if (localError) setLocalError('');
          }}
          placeholder="e.g. Withdrawal pending, game not loading, need help with deposit…"
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-white/15 dark:bg-[#1a1a1c] dark:text-white dark:placeholder:text-gray-500"
        />
        <p className="mt-1 text-[11px] text-gray-400 text-right">{issue.length}/{MAX_ISSUE_LEN}</p>
      </div>

      {displayError && (
        <p className="text-xs text-red-500">{displayError}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!connected}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
      >
        <HiOutlinePhone className="h-5 w-5" />
        Request a Call
      </button>
      {!connected && (
        <p className="text-[11px] text-center text-gray-500">Connecting to call service…</p>
      )}
    </div>
  );
}
