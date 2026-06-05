import React, { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import {
  dismissIosCallSetupModal,
  shouldShowIosCallSetupModal,
} from '../../services/iosCallSetup';
import IosCallSetupCard from './IosCallSetupCard';

/** One-time prompt so iPhone players complete Home Screen + notification setup. */
export default function IosCallSetupModal() {
  const { pushAlertsEnabled } = useCall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(shouldShowIosCallSetupModal(pushAlertsEnabled));
  }, [pushAlertsEnabled]);

  if (!open) return null;

  const close = () => {
    dismissIosCallSetupModal();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/70 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-white p-5 shadow-2xl dark:bg-[#1a1a1c] dark:text-white">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">Receive support calls</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Two quick steps so telecallers can reach you on iPhone.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <IosCallSetupCard />
        <button
          type="button"
          onClick={close}
          className="mt-4 w-full text-center text-xs text-gray-500 underline dark:text-gray-400"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}
