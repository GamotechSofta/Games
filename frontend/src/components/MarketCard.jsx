import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMarketCardTheme, getMarketImageUrl } from '../config/marketCardThemes';

const toMarketNameKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
};

const ClockIcon = () => (
  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
  </svg>
);

/** Outer drop shadow (wrapper — not clipped) */
const CARD_OUTER_SHADOW =
  '0 14px 48px rgba(0, 0, 0, 0.95), 0 8px 28px rgba(0, 0, 0, 0.8), 0 3px 10px rgba(0, 0, 0, 0.65)';

/** Inset shadow on the card face (full area) */
const CARD_INSET_SHADOW =
  'inset 0 0 70px rgba(0, 0, 0, 0.75), inset 0 0 35px rgba(0, 0, 0, 0.55), inset 0 0 12px rgba(0, 0, 0, 0.45)';

const STATUS_STYLES = {
  open: {
    badge: 'bg-green-600 text-white border-green-400',
    border: 'rgba(34, 197, 94, 0.55)',
    accent: '#4ade80',
    cta: 'text-green-300 hover:text-green-200',
  },
  running: {
    badge: 'bg-green-600 text-white border-green-400',
    border: 'rgba(34, 197, 94, 0.55)',
    accent: '#4ade80',
    cta: 'text-green-300 hover:text-green-200',
  },
  closed: {
    badge: 'bg-red-600 text-white border-red-400',
    border: 'rgba(239, 68, 68, 0.55)',
    accent: '#f87171',
    cta: 'text-red-300 hover:text-red-200',
  },
};

/**
 * Market card — reference layout: status, time, name, result, CTA; BG image on the right.
 */
export default function MarketCard({
  market,
  themeIndex = 0,
  onPlay,
  onScheduleTomorrow,
}) {
  const { t } = useTranslation();
  const theme = getMarketCardTheme(themeIndex);
  const isClosed = market.status === 'closed';
  const isRunning = market.status === 'running';
  const isOpen = market.status === 'open';
  const isClickable = isOpen || isRunning;

  const displayName = t(`markets.names.${toMarketNameKey(market.gameName)}`, { defaultValue: market.gameName });
  const imageUrl = getMarketImageUrl(market.gameName);
  const [bgFailed, setBgFailed] = useState(false);
  const showPhoto = imageUrl && !bgFailed;

  const statusKey = isClosed ? 'closed' : isRunning ? 'running' : 'open';
  const statusStyle = STATUS_STYLES[statusKey];

  const statusLabel = isClosed
    ? t('markets.statusClosed')
    : isRunning
      ? t('markets.statusRunning')
      : t('markets.statusOpen');

  const handleCardClick = () => {
    if (isClickable && onPlay) onPlay(market);
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isClosed && onScheduleTomorrow) onScheduleTomorrow(market);
    else if (isClickable && onPlay) onPlay(market);
  };

  return (
    <div
      className={`rounded-xl transition-all duration-300 ${
        isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
      }`}
      style={{ boxShadow: CARD_OUTER_SHADOW }}
      onClick={handleCardClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
    <article
      className="group relative overflow-hidden rounded-xl border min-h-[148px] sm:min-h-[168px]"
      style={{
        borderColor: statusStyle.border,
        boxShadow: CARD_INSET_SHADOW,
      }}
    >
      {/* Base + placeholder gradient */}
      <div
        className="absolute inset-0 bg-[#0a0c10]"
        style={{ background: theme.placeholder }}
        aria-hidden
      />

      {/* Optional market photo (right) — add files to public/images/markets/{slug}.webp */}
      {showPhoto ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-right opacity-90"
          onError={() => setBgFailed(true)}
          aria-hidden
        />
      ) : (
        <div
          className="absolute right-0 top-0 bottom-0 w-[55%] opacity-40"
          aria-hidden
        >
          <div
            className="w-full h-full"
            style={{
              background: `repeating-linear-gradient(
                -12deg,
                transparent,
                transparent 8px,
                rgba(255,255,255,0.03) 8px,
                rgba(255,255,255,0.03) 16px
              )`,
            }}
          />
          <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-wider text-white/25 font-medium">
            {t('markets.imagePlaceholder')}
          </span>
        </div>
      )}

      {/* Full-card black shadow wash + edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[5] rounded-xl bg-black/45"
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none z-[6] rounded-xl"
        style={{
          background: [
            'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 28%)',
            'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 28%)',
            'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 35%)',
            'linear-gradient(to left, rgba(0,0,0,0.55) 0%, transparent 30%)',
            'radial-gradient(ellipse 110% 95% at 50% 50%, transparent 20%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.7) 100%)',
          ].join(', '),
        }}
        aria-hidden
      />

      {/* Left fade so text stays readable */}
      <div
        className="absolute inset-0 z-[7] bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/92 to-transparent"
        style={{ background: 'linear-gradient(90deg, #0a0c10 0%, #0a0c10e6 45%, transparent 72%)' }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col h-full p-4 sm:p-5 min-h-[148px] sm:min-h-[168px]">
        <span
          className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wide border shrink-0 ${statusStyle.badge}`}
        >
          {statusLabel}
        </span>

        <div className="flex items-center gap-2 py-1 text-gray-300 mt-0">
          <ClockIcon />
          <span className="text-xs sm:text-sm font-semibold truncate">{market.timeRange}</span>
        </div>

        <h3 className="mt-2 sm:mt-2.5 py-0.5 text-white text-lg sm:text-xl md:text-2xl font-bold leading-snug break-words pr-2">
          {displayName}
        </h3>

        <p
          className="mt-2 sm:mt-3 py-0.5 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wider leading-none"
          style={{ color: statusStyle.accent }}
        >
          {market.result}
        </p>

        <div className="mt-auto pt-2">
          {isClosed ? (
            <button
              type="button"
              onClick={handleActionClick}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wide transition-colors ${STATUS_STYLES.closed.cta}`}
            >
              {t('markets.runningForTomorrow')}
              <ChevronRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActionClick}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wide transition-colors ${statusStyle.cta}`}
            >
              {t('markets.playNow')}
              <ChevronRight />
            </button>
          )}
        </div>
      </div>
    </article>
    </div>
  );
}

export function MarketCardSkeleton({ themeIndex = 0 }) {
  const theme = getMarketCardTheme(themeIndex);
  return (
    <div className="rounded-xl" style={{ boxShadow: CARD_OUTER_SHADOW }}>
    <div
      className="rounded-xl border min-h-[148px] sm:min-h-[168px] overflow-hidden skeleton-shimmer bg-[#0a0c10]"
      style={{ borderColor: theme.border, boxShadow: CARD_INSET_SHADOW }}
    >
      <div className="p-4 sm:p-5 space-y-4">
        <div className="h-5 w-16 rounded-full bg-white/10" />
        <div className="h-3 w-28 rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-7 w-24 rounded bg-white/10" />
        <div className="h-8 w-28 rounded-lg bg-white/10" />
      </div>
    </div>
    </div>
  );
}
