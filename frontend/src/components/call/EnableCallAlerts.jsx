import React from 'react';
import { HiOutlineBell } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import { isIosDevice, isStandalonePwa } from '../../services/callNotificationService';

/**
 * Enable Web Push so "Aakda.in is calling" shows when site is closed / phone locked (no Firebase).
 */
export default function EnableCallAlerts({ className = '' }) {
  const { pushAlertsEnabled, pushError, enableCallAlerts } = useCall();
  const ios = isIosDevice();
  const needsHomeScreen = ios && !isStandalonePwa();

  if (pushAlertsEnabled) {
    return (
      <div className={className}>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <HiOutlineBell className="h-4 w-4 shrink-0" />
          Call alerts on — you can get incoming calls when the screen is locked.
        </p>
        {needsHomeScreen && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2">
            On iPhone: add Aakda to your Home Screen (Share → Add to Home Screen), then open from that icon so locked-screen alerts work.
          </p>
        )}
      </div>
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
        Required for &quot;Aakda.in is calling&quot; when you lock your phone or switch apps. Allow notifications when prompted.
      </p>
      {needsHomeScreen && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2">
          iPhone: install the app to Home Screen first, then enable alerts from that icon (Safari alone may not ring when locked).
        </p>
      )}
      {pushError && (
        <p className="text-xs text-red-500 mt-1">{pushError}</p>
      )}
    </div>
  );
}
