import React from 'react';
import { HiOutlineBell, HiOutlineDeviceMobile, HiOutlineShare } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import { isIosDevice } from '../../services/callNotificationService';
import { getIosCallSetupStep } from '../../services/iosCallSetup';

function StepBadge({ n, done }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-500 text-white'
      }`}
    >
      {done ? '✓' : n}
    </span>
  );
}

function IosInstallSteps() {
  return (
    <ol className="mt-3 space-y-2.5 text-xs text-amber-900 dark:text-amber-100">
      <li className="flex gap-2.5">
        <StepBadge n={1} done={false} />
        <span>
          Open <strong>www.aakda.in</strong> in <strong>Safari</strong> (not Chrome).
        </span>
      </li>
      <li className="flex gap-2.5">
        <StepBadge n={2} done={false} />
        <span className="flex items-start gap-1.5">
          <HiOutlineShare className="mt-0.5 h-4 w-4 shrink-0" />
          Tap <strong>Share</strong> at the bottom → <strong>Add to Home Screen</strong>.
        </span>
      </li>
      <li className="flex gap-2.5">
        <StepBadge n={3} done={false} />
        <span className="flex items-start gap-1.5">
          <HiOutlineDeviceMobile className="mt-0.5 h-4 w-4 shrink-0" />
          Open <strong>Aakda</strong> from your Home Screen icon, then come back here.
        </span>
      </li>
    </ol>
  );
}

/**
 * Guided iPhone call setup: Home Screen install → enable notifications.
 * On Android/desktop shows a simple enable button.
 */
export default function IosCallSetupCard({ className = '', compact = false }) {
  const { pushAlertsEnabled, pushError, enableCallAlerts } = useCall();
  const ios = isIosDevice();
  const step = getIosCallSetupStep({ pushAlertsEnabled });

  if (!ios) {
    if (pushAlertsEnabled) {
      return (
        <div className={className}>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <HiOutlineBell className="h-4 w-4 shrink-0" />
            Call alerts on — incoming calls work when the screen is locked.
          </p>
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
          Enable call alerts
        </button>
        {pushError && <p className="text-xs text-red-500 mt-2">{pushError}</p>}
      </div>
    );
  }

  if (step === 'ready') {
    return (
      <div className={className}>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <HiOutlineBell className="h-4 w-4 shrink-0" />
          iPhone call alerts ready — you will get &quot;Aakda.in is calling&quot; when locked.
        </p>
      </div>
    );
  }

  if (step === 'need-pwa') {
    return (
      <div
        className={`rounded-xl border-2 border-amber-500/50 bg-amber-500/10 ${
          compact ? 'px-3 py-2.5' : 'px-4 py-3'
        } ${className}`}
      >
        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
          Step 1 of 2 — Add Aakda to Home Screen
        </p>
        <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 mt-1">
          iPhone only rings when locked if you open the app from your Home Screen (Apple rule).
        </p>
        {!compact && <IosInstallSteps />}
        {compact && (
          <p className="text-[11px] text-amber-800 mt-2">
            Safari → Share → Add to Home Screen → open that icon.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
        Step 2 of 2 — Home Screen app detected. Turn on call notifications.
      </div>
      <button
        type="button"
        onClick={enableCallAlerts}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200"
      >
        <HiOutlineBell className="h-5 w-5" />
        Enable call alerts
      </button>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Tap Allow when iPhone asks for notification permission.
      </p>
      {pushError && <p className="text-xs text-red-500">{pushError}</p>}
    </div>
  );
}
