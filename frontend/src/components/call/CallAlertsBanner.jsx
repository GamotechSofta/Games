import React, { useState } from 'react';
import { HiOutlineBell, HiX } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

const DISMISS_KEY = 'callAlertsBannerDismissed';

/**
 * Prompt logged-in players to enable call alerts (needed for locked-screen notifications).
 */
export default function CallAlertsBanner() {
  const { pushAlertsEnabled, pushError, enableCallAlerts } = useCall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (pushAlertsEnabled || dismissed) return null;
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mx-3 mt-2 mb-1 flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm">
      <HiOutlineBell className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          Enable call alerts
        </p>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-0.5">
          So you hear incoming calls when your phone is locked.
        </p>
        <button
          type="button"
          onClick={enableCallAlerts}
          className="mt-2 text-xs font-bold text-amber-900 underline dark:text-amber-100"
        >
          Turn on notifications
        </button>
        {pushError && (
          <p className="text-[11px] text-red-600 mt-1">{pushError}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-1 text-amber-800/70 hover:text-amber-900"
        aria-label="Dismiss"
      >
        <HiX className="h-4 w-4" />
      </button>
    </div>
  );
}
