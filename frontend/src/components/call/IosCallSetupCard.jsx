import React, { useState } from 'react';
import { HiOutlineBell, HiOutlineCheckCircle } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import { isIosDevice } from '../../services/callNotificationService';
import { getIosCallSetupStep } from '../../services/iosCallSetup';

function StepRow({ n, title, detail, done }) {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function NotificationPermissionPrompt({ onConfirm, onCancel, loading }) {
  return (
    <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-500/10 to-transparent p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white">
          <HiOutlineBell className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Allow call notifications</p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
            We only use this for incoming support calls — &quot;Aakda.in is calling&quot; with Answer / Decline.
            No ads or promotions.
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
        <li className="flex items-center gap-2">
          <HiOutlineCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          Works when your screen is locked
        </li>
        <li className="flex items-center gap-2">
          <HiOutlineCheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          Tap Allow on the next system popup
        </li>
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 dark:border-white/15 dark:text-gray-300"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Enabling…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

export default function IosCallSetupCard({ className = '', compact = false }) {
  const { pushAlertsEnabled, pushError, enableCallAlerts, isEnablingAlerts } = useCall();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const ios = isIosDevice();
  const step = getIosCallSetupStep({ pushAlertsEnabled });

  const handleEnable = () => {
    setShowPermissionPrompt(true);
  };

  const confirmEnable = () => {
    void enableCallAlerts().finally(() => setShowPermissionPrompt(false));
  };

  if (!ios) {
    if (pushAlertsEnabled) {
      return (
        <div className={`flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 ${className}`}>
          <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 dark:text-emerald-200">Call alerts enabled</p>
        </div>
      );
    }
    if (showPermissionPrompt) {
      return (
        <div className={className}>
          <NotificationPermissionPrompt
            onConfirm={confirmEnable}
            onCancel={() => setShowPermissionPrompt(false)}
            loading={isEnablingAlerts}
          />
        </div>
      );
    }
    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleEnable}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
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
      <div className={`flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 ${className}`}>
        <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800 dark:text-emerald-200">iPhone call alerts ready</p>
      </div>
    );
  }

  if (step === 'need-pwa') {
    if (compact) {
      return (
        <p className={`text-xs text-gray-600 dark:text-gray-300 ${className}`}>
          iPhone: Safari → Share → Add to Home Screen, then open that icon.
        </p>
      );
    }
    return (
      <div className={`space-y-2 ${className}`}>
        <StepRow
          n={1}
          title="Use Safari"
          detail="Open www.aakda.in in Safari (not Chrome)."
          done={false}
        />
        <StepRow
          n={2}
          title="Add to Home Screen"
          detail="Tap Share at the bottom, then Add to Home Screen."
          done={false}
        />
        <StepRow
          n={3}
          title="Open the app icon"
          detail="Launch Aakda from your Home Screen, then enable alerts below."
          done={false}
        />
      </div>
    );
  }

  if (showPermissionPrompt) {
    return (
      <div className={className}>
        <NotificationPermissionPrompt
          onConfirm={confirmEnable}
          onCancel={() => setShowPermissionPrompt(false)}
          loading={isEnablingAlerts}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <StepRow
        n={1}
        title="Home Screen app"
        detail="Detected — you opened Aakda from your Home Screen."
        done
      />
      <StepRow
        n={2}
        title="Turn on notifications"
        detail="Tap below, then Allow on the iPhone popup."
        done={false}
      />
      <button
        type="button"
        onClick={handleEnable}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        <HiOutlineBell className="h-5 w-5" />
        Enable call alerts
      </button>
      {pushError && <p className="text-xs text-red-500">{pushError}</p>}
    </div>
  );
}
