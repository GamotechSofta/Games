import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiX } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  dismissIosCallSetupModal,
  shouldShowIosCallSetupModal,
} from '../../services/iosCallSetup';
import IosCallSetupCard from './IosCallSetupCard';

/** Profile-first setup sheet — hidden during active calls to avoid layout clash. */
export default function IosCallSetupModal() {
  const { pushAlertsEnabled, isCallOverlayOpen } = useCall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isCallOverlayOpen) {
      setOpen(false);
      return;
    }
    setOpen(shouldShowIosCallSetupModal(pushAlertsEnabled));
  }, [pushAlertsEnabled, isCallOverlayOpen]);

  useBodyScrollLock(open);

  if (!open) return null;

  const close = () => {
    dismissIosCallSetupModal();
    setOpen(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={close}
      />
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-gray-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141416] mx-0 sm:mx-4"
        style={{
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-white/20" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">Never miss a support call</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[18rem]">
              Quick setup so telecallers can reach you — even when your phone is locked.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-4">
          <IosCallSetupCard />
          <button
            type="button"
            onClick={close}
            className="mt-4 w-full py-2 text-center text-xs text-gray-500 dark:text-gray-400"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
