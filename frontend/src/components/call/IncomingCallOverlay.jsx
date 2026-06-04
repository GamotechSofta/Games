import React from 'react';
import { HiOutlinePhone, HiOutlinePhoneMissedCall } from 'react-icons/hi';
import { useCall } from '../../context/CallContext';

/** Full-screen incoming call UI (accept / reject) */
export default function IncomingCallOverlay() {
  const { incoming, acceptIncoming, rejectIncoming, callStatus } = useCall();

  if (!incoming || callStatus !== 'ringing') return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a1c] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-600/20 text-teal-400">
          <HiOutlinePhone className="h-10 w-10 animate-pulse" />
        </div>
        <p className="text-sm text-gray-400">Incoming call</p>
        <p className="mt-1 text-xl font-bold text-white">{incoming.callerName}</p>
        <p className="mt-2 text-sm text-gray-500">Audio call from support team</p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={rejectIncoming}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white"
          >
            <HiOutlinePhoneMissedCall className="h-5 w-5" />
            Reject
          </button>
          <button
            type="button"
            onClick={acceptIncoming}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white"
          >
            <HiOutlinePhone className="h-5 w-5" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
