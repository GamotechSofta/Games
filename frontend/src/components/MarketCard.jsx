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
  <svg className="w-3.5 h-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
  </svg>
);

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

  const statusLabel = isClosed
    ? t('markets.statusClosed')
    : isRunning
      ? t('markets.statusRunning')
      : t('markets.statusOpen');

  const statusBadgeClass = isClosed
    ? 'bg-red-600/90 text-white border-red-400/50'
    : 'bg-emerald-600/90 text-white border-emerald-400/50';

  const handleCardClick = () => {
    if (isClickable && onPlay) onPlay(market);
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isClosed && onScheduleTomorrow) onScheduleTomorrow(market);
    else if (isClickable && onPlay) onPlay(market);
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border min-h-[132px] sm:min-h-[148px] transition-all duration-300 ${
        isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
      }`}
      style={{
        borderColor: theme.border,
        boxShadow: `0 4px 18px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.45), 0 0 10px ${theme.glow}, inset 0 0 0 1px rgba(255, 255, 255, 0.04)`,
      }}
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

      {/* Left fade so text stays readable */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/92 to-transparent"
        style={{ background: 'linear-gradient(90deg, #0a0c10 0%, #0a0c10e6 45%, transparent 72%)' }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col h-full p-3 sm:p-3.5 min-h-[132px] sm:min-h-[148px]">
        <span
          className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide border ${statusBadgeClass}`}
        >
          {statusLabel}
        </span>

        <div className="flex items-center gap-1.5 mt-2 text-gray-400">
          <ClockIcon />
          <span className="text-[10px] sm:text-xs font-medium truncate">{market.timeRange}</span>
        </div>

        <h3 className="mt-1.5 text-white text-sm sm:text-base font-bold leading-tight break-words pr-2">
          {displayName}
        </h3>

        <p
          className="mt-1 text-lg sm:text-xl md:text-2xl font-extrabold tracking-wider leading-none"
          style={{ color: theme.accent }}
        >
          {market.result}
        </p>

        <div className="mt-auto pt-2">
          {isClosed ? (
            <button
              type="button"
              onClick={handleActionClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-colors hover:bg-white/5"
              style={{ borderColor: theme.border, color: theme.accent }}
            >
              {t('markets.runningForTomorrow')}
              <ChevronRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActionClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-colors hover:bg-white/5"
              style={{ borderColor: theme.border, color: theme.accent }}
            >
              {t('markets.playNow')}
              <ChevronRight />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function MarketCardSkeleton({ themeIndex = 0 }) {
  const theme = getMarketCardTheme(themeIndex);
  return (
    <div
      className="rounded-xl border min-h-[132px] sm:min-h-[148px] overflow-hidden skeleton-shimmer bg-[#0a0c10]"
      style={{
        borderColor: theme.border,
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.45)',
      }}
    >
      <div className="p-3 sm:p-3.5 space-y-3">
        <div className="h-5 w-16 rounded-full bg-white/10" />
        <div className="h-3 w-28 rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-7 w-24 rounded bg-white/10" />
        <div className="h-8 w-28 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}
