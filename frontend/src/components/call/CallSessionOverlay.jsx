import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlinePhone,
  HiOutlinePhoneMissedCall,
  HiOutlineMicrophone,
  HiOutlineVolumeUp,
  HiOutlineVolumeOff,
} from 'react-icons/hi';
import { useCall } from '../../context/CallContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { unlockCallAudio } from '../../services/callAudioUnlock';
import { startCallRingtone } from '../../services/callRingtoneService';

function formatDuration(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function CallerAvatar({ name }) {
  const initials = useMemo(() => {
    const parts = String(name || 'A').trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.[0] || 'A').toUpperCase();
  }, [name]);

  return (
    <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/30 to-emerald-600/20 ring-4 ring-white/10 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
      <span className="text-3xl font-bold text-white">{initials}</span>
      <span className="absolute inset-0 rounded-full border border-white/20" />
    </div>
  );
}

function ActionButton({ label, onClick, className, children, large }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 ${className}`}
    >
      <span
        className={`flex items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${
          large ? 'h-16 w-16' : 'h-14 w-14'
        }`}
      >
        {children}
      </span>
      <span className="text-xs font-medium text-white/80">{label}</span>
    </button>
  );
}

/** Full-screen call UI: ringing → connecting → in-call controls stay visible. */
export default function CallSessionOverlay() {
  const {
    callStatus,
    activeSession,
    acceptIncoming,
    rejectIncoming,
    endCall,
    isMuted,
    toggleMute,
    speakerOn,
    toggleSpeaker,
    callDurationSec,
  } = useCall();

  const [endedVisible, setEndedVisible] = useState(false);
  const isOpen = ['ringing', 'connecting', 'in-call', 'waiting'].includes(callStatus) || endedVisible;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (callStatus === 'ended' || callStatus === 'rejected') {
      setEndedVisible(true);
      const t = setTimeout(() => setEndedVisible(false), 1600);
      return () => clearTimeout(t);
    }
    setEndedVisible(false);
    return undefined;
  }, [callStatus]);

  if (!isOpen || !activeSession) return null;

  const { callerName } = activeSession;

  const statusLabel = {
    ringing: 'Incoming call',
    connecting: 'Connecting…',
    'in-call': formatDuration(callDurationSec),
    waiting: 'Waiting for telecaller',
    ended: 'Call ended',
    rejected: 'Call declined',
  }[callStatus] || 'Call';

  const onOverlayTouch = () => {
    if (callStatus === 'ringing') {
      void unlockCallAudio().then(() => startCallRingtone());
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[250] flex flex-col bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#020617] text-white"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
      }}
      onPointerDown={onOverlayTouch}
      role="dialog"
      aria-modal="true"
      aria-label="Active call"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <CallerAvatar name={callerName} />

        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-300/90">
          {callStatus === 'in-call' ? 'On call' : statusLabel}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">{callerName}</h2>
        <p className="mt-2 max-w-xs text-sm text-white/55">
          {callStatus === 'ringing' && 'Support team is calling you'}
          {callStatus === 'connecting' && 'Setting up secure voice connection…'}
          {callStatus === 'in-call' && 'Tap controls below during your call'}
          {callStatus === 'waiting' && 'A telecaller will call you shortly. Keep this screen open.'}
          {(callStatus === 'ended' || callStatus === 'rejected') && 'You can continue using the app'}
        </p>

        {callStatus === 'connecting' && (
          <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Connecting audio…
          </div>
        )}

        {callStatus === 'in-call' && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live · {formatDuration(callDurationSec)}
          </div>
        )}
      </div>

      <div className="relative px-6 pb-2">
        {callStatus === 'ringing' && (
          <div className="flex items-center justify-center gap-10">
            <ActionButton
              label="Decline"
              onClick={rejectIncoming}
              className="text-red-200"
              large
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-red-600 hover:bg-red-500">
                <HiOutlinePhoneMissedCall className="h-7 w-7" />
              </span>
            </ActionButton>
            <ActionButton
              label="Accept"
              onClick={acceptIncoming}
              className="text-emerald-200"
              large
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 animate-pulse">
                <HiOutlinePhone className="h-7 w-7" />
              </span>
            </ActionButton>
          </div>
        )}

        {(callStatus === 'connecting' || callStatus === 'in-call') && (
          <div className="mx-auto flex max-w-sm items-center justify-between gap-4">
            <ActionButton label={isMuted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
              <span
                className={`flex h-full w-full items-center justify-center rounded-full ${
                  isMuted ? 'bg-amber-600' : 'bg-white/15 hover:bg-white/20'
                }`}
              >
                <HiOutlineMicrophone className={`h-6 w-6 ${isMuted ? 'opacity-60' : ''}`} />
              </span>
            </ActionButton>

            <ActionButton label="End" onClick={endCall} large>
              <span className="flex h-full w-full items-center justify-center rounded-full bg-red-600 hover:bg-red-500">
                <HiOutlinePhoneMissedCall className="h-7 w-7 rotate-[135deg]" />
              </span>
            </ActionButton>

            <ActionButton label={speakerOn ? 'Speaker' : 'Speaker off'} onClick={toggleSpeaker}>
              <span
                className={`flex h-full w-full items-center justify-center rounded-full ${
                  speakerOn ? 'bg-white/15 hover:bg-white/20' : 'bg-amber-600'
                }`}
              >
                {speakerOn ? (
                  <HiOutlineVolumeUp className="h-6 w-6" />
                ) : (
                  <HiOutlineVolumeOff className="h-6 w-6" />
                )}
              </span>
            </ActionButton>
          </div>
        )}

        {callStatus === 'waiting' && (
          <button
            type="button"
            onClick={endCall}
            className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-3.5 text-sm font-semibold"
          >
            Cancel request
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
