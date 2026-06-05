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

function CallerAvatar({ name, pulsing }) {
  const initials = useMemo(() => {
    const parts = String(name || 'A').trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0]?.[0] || 'A').toUpperCase();
  }, [name]);

  return (
    <div className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center">
      {pulsing && (
        <>
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <span className="absolute -inset-3 rounded-full border border-emerald-400/25 animate-pulse" />
          <span className="absolute -inset-6 rounded-full border border-emerald-400/10" />
        </>
      )}
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a5f] via-[#0f766e] to-[#065f46] shadow-[0_20px_60px_rgba(16,185,129,0.35)] ring-1 ring-white/20">
        <span className="text-4xl font-bold tracking-tight text-white">{initials}</span>
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, variant = 'default', large, children }) {
  const shell = {
    default: 'bg-white/12 hover:bg-white/18 backdrop-blur-sm',
    danger: 'bg-red-500 hover:bg-red-400 shadow-[0_8px_28px_rgba(239,68,68,0.45)]',
    active: 'bg-amber-500/90 hover:bg-amber-500',
  }[variant];

  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2.5 min-w-[4.5rem]">
      <span
        className={`flex items-center justify-center rounded-full text-white transition active:scale-95 ${shell} ${
          large ? 'h-[4.5rem] w-[4.5rem]' : 'h-14 w-14'
        }`}
      >
        {children}
      </span>
      <span className="text-[11px] font-medium tracking-wide text-white/75">{label}</span>
    </button>
  );
}

/** Full-screen call UI — only for incoming / active calls (not request-waiting). */
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
    isCallOverlayOpen,
  } = useCall();

  const [endedVisible, setEndedVisible] = useState(false);
  const showOverlay = isCallOverlayOpen || endedVisible;

  useBodyScrollLock(showOverlay);

  useEffect(() => {
    if (callStatus === 'ended' || callStatus === 'rejected') {
      setEndedVisible(true);
      const t = setTimeout(() => setEndedVisible(false), 1800);
      return () => clearTimeout(t);
    }
    setEndedVisible(false);
    return undefined;
  }, [callStatus]);

  useEffect(() => {
    if (!showOverlay) return undefined;
    document.documentElement.classList.add('call-overlay-open');
    return () => document.documentElement.classList.remove('call-overlay-open');
  }, [showOverlay]);

  if (!showOverlay || !activeSession) return null;

  const { callerName } = activeSession;
  const isRinging = callStatus === 'ringing';
  const isConnecting = callStatus === 'connecting';
  const isLive = callStatus === 'in-call';
  const isDone = callStatus === 'ended' || callStatus === 'rejected' || endedVisible;

  const onOverlayTouch = () => {
    if (isRinging) {
      void unlockCallAudio().then(() => startCallRingtone());
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[10050] flex flex-col overflow-hidden text-white"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
      }}
      onPointerDown={onOverlayTouch}
      role="dialog"
      aria-modal="true"
      aria-label="Phone call"
    >
      <div className="absolute inset-0 bg-[#06080f]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.18),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(14,165,233,0.12),transparent_65%)]" />

      <div className="relative flex flex-1 flex-col">
        <div className="px-5 pt-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/90">
            {isRinging && 'Incoming call'}
            {isConnecting && 'Connecting'}
            {isLive && 'On call'}
            {isDone && (callStatus === 'rejected' ? 'Declined' : 'Call ended')}
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-4 text-center">
          <CallerAvatar name={callerName} pulsing={isRinging || isConnecting} />

          <h2 className="text-[1.65rem] font-bold leading-tight tracking-tight">{callerName}</h2>
          <p className="mt-2 text-sm text-white/50">Aakda Support · Audio only</p>

          {isRinging && (
            <p className="mt-4 text-sm text-white/70">Support team is calling you now</p>
          )}
          {isConnecting && (
            <div className="mt-5 flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Connecting secure voice…
            </div>
          )}
          {isLive && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-5 py-2 text-base font-semibold tabular-nums text-emerald-100">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              {formatDuration(callDurationSec)}
            </div>
          )}
          {isDone && (
            <p className="mt-4 text-sm text-white/55">Returning to the app…</p>
          )}
        </div>

        {!isDone && (
          <div className="relative mx-4 mb-2 rounded-[2rem] border border-white/10 bg-white/[0.06] px-5 py-6 backdrop-blur-xl">
            {isRinging && (
              <div className="flex items-center justify-center gap-14">
                <ControlButton label="Decline" onClick={rejectIncoming} variant="danger" large>
                  <HiOutlinePhoneMissedCall className="h-8 w-8" />
                </ControlButton>
                <ControlButton label="Accept" onClick={acceptIncoming} variant="default" large>
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_28px_rgba(16,185,129,0.45)]">
                    <HiOutlinePhone className="h-8 w-8" />
                  </span>
                </ControlButton>
              </div>
            )}

            {(isConnecting || isLive) && (
              <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
                <ControlButton
                  label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={toggleMute}
                  variant={isMuted ? 'active' : 'default'}
                >
                  <HiOutlineMicrophone className={`h-6 w-6 ${isMuted ? 'opacity-70' : ''}`} />
                </ControlButton>

                <ControlButton label="End call" onClick={endCall} variant="danger" large>
                  <HiOutlinePhone className="h-8 w-8 rotate-[135deg]" />
                </ControlButton>

                <ControlButton
                  label={speakerOn ? 'Speaker' : 'Muted'}
                  onClick={toggleSpeaker}
                  variant={speakerOn ? 'default' : 'active'}
                >
                  {speakerOn ? (
                    <HiOutlineVolumeUp className="h-6 w-6" />
                  ) : (
                    <HiOutlineVolumeOff className="h-6 w-6" />
                  )}
                </ControlButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
