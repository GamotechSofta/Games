import React from 'react';
import { HiOutlineBell } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

/**
 * Enable Web Push so "Aakda.in is calling" shows when site is closed / phone locked (no Firebase).
 */
export default function EnableCallAlerts({ className = '' }) {
  const { pushAlertsEnabled, pushError, enableCallAlerts } = useCall();

  if (pushAlertsEnabled) {
    return (
      <p className={`text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 ${className}`}>
        <HiOutlineBell className="h-4 w-4 shrink-0" />
        Call alerts on — you can receive calls when the app is in the background.
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={enableCallAlerts}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200"
      >
        <HiOutlineBell className="h-5 w-5" />
        Enable call alerts (Aakda.in calling)
      </button>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
        Required for incoming calls when you leave the site or lock your phone. Uses browser notifications, not Firebase.
      </p>
      {pushError && (
        <p className="text-xs text-red-500 mt-1">{pushError}</p>
      )}
    </div>
  );
}
