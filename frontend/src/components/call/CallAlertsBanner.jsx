import React, { useState } from 'react';
import { HiX } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import { isIosCallReady } from '../../services/iosCallSetup';
import IosCallSetupCard from './IosCallSetupCard';

const DISMISS_KEY = 'callAlertsBannerDismissed';

export default function CallAlertsBanner() {
  const { pushAlertsEnabled } = useCall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (isIosCallReady(pushAlertsEnabled) || dismissed) return null;
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mx-3 mt-2 mb-1 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 text-amber-800/70 hover:text-amber-900"
        aria-label="Dismiss"
      >
        <HiX className="h-4 w-4" />
      </button>
      <IosCallSetupCard compact />
    </div>
  );
}
