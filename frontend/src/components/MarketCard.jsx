import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OptimizedImage from './OptimizedImage';
import { POPULAR_MARKET_CARD } from '../config/homeAssets';

const toMarketNameKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
};

function MarketCard({ market }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const isOpen = market.status === 'open' || market.status === 'running';
  const isClickable = true;
  const handleClick = () => {
    if (isOpen) {
      navigate('/bidoptions', { state: { market } });
      return;
    }
    setShowClosedModal(true);
  };

  const handleTomorrow = (e) => {
    e.stopPropagation();
    navigate('/bidoptions', { state: { market, scheduleForTomorrow: true } });
  };
  const handlePlaceBetTomorrow = () => {
    navigate('/bidoptions', { state: { market, scheduleForTomorrow: true } });
    setShowClosedModal(false);
  };

  const displayName = t(`markets.names.${toMarketNameKey(market.gameName)}`, {
    defaultValue: market.gameName,
  });

  const resultValue = market.result || '***-**-***';
  const statusLabel =
    market.status === 'open'
      ? t('markets.statusOpen', { defaultValue: 'Open' })
      : market.status === 'running'
        ? t('homeMobile.live', { defaultValue: 'Live' })
        : t('markets.statusClosed', { defaultValue: 'Closed' });
  const badgeStyle = isOpen
    ? 'border-emerald-300/25 bg-emerald-500/16 text-emerald-50'
    : 'border-red-300/30 bg-red-500/18 text-white';
  const cardImage = isOpen ? POPULAR_MARKET_CARD.open : POPULAR_MARKET_CARD.closed;

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isOpen) {
      handleClick();
      return;
    }
    setShowClosedModal(true);
  };

  const closedModal = showClosedModal ? (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4"
    >
      <div
        className="relative w-full max-w-[340px] rounded-2xl border border-white/10 bg-[#14161d] p-4 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowClosedModal(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="text-[12px] font-semibold leading-snug text-white">
          {t('markets.closedForToday', { defaultValue: 'Market is closed for today.' })}
        </p>
        <p className="mt-1 text-[12px] text-white/80">
          {t('markets.betTomorrowHint', { defaultValue: 'You can place your bet for tomorrow.' })}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlaceBetTomorrow}
            className="flex-1 rounded-lg bg-[#d32f2f] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#b92b2b]"
          >
            {t('markets.placeBet', { defaultValue: 'Place Bet' })}
          </button>
          <button
            type="button"
            onClick={() => setShowClosedModal(false)}
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white hover:bg-white/10"
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && handleClick()}
        className={`relative flex h-full min-h-[182px] w-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#14161d] transition-all duration-200 sm:min-h-[190px] ${
          isClickable
            ? 'cursor-pointer hover:-translate-y-0.5'
            : ''
        }`}
      >
      <div className="relative h-[76px] overflow-hidden rounded-b-[12px] sm:h-[80px]">
        <OptimizedImage
          webp={cardImage.webp}
          png={cardImage.png}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover object-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,12,0.05)_25%,rgba(10,10,12,0.72)_100%)]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <div className="space-y-0.5">
          <div className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase ${badgeStyle}`}>
            {statusLabel}
          </div>
          <div className="truncate text-[11px] font-extrabold uppercase tracking-[0.03em] text-white">
            {displayName}
          </div>
          <div className="w-full overflow-visible text-left">
            <div className="text-[24px] font-black leading-[0.95] tracking-[0.02em] text-[#d7a11f] sm:text-[26px]">
              {resultValue}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="rounded-[14px] bg-[#3a3d49] px-2 py-0.5">
          <div className="grid grid-cols-3 items-center gap-1">
            <div className="text-center">
              <div className="text-[11px] font-bold text-white">{market.startingTime ? market.timeRange.split(' - ')[0] : '--'}</div>
              <div className="text-[9px] font-semibold uppercase text-white/90">Open</div>
            </div>
            <div className="flex justify-center">
              <svg className="h-6 w-6 text-white/85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l2.5 2.5" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-[11px] font-bold text-white">{market.closingTime ? market.timeRange.split(' - ')[1] : '--'}</div>
              <div className="text-[9px] font-semibold uppercase text-white/90">Close</div>
            </div>
          </div>
          </div>
          <button
            type="button"
            onClick={handleActionClick}
            className={`w-full pl-1 text-left text-[10px] font-semibold ${
              market.status === 'closed' ? 'text-white/90' : 'text-emerald-300'
            }`}
          >
            {market.status === 'closed'
              ? t('markets.runningForTomorrow')
              : t('markets.tapToPlay', { defaultValue: 'Tap to Play' })}
          </button>
        </div>
      </div>

      </div>
      {typeof document !== 'undefined' && closedModal ? createPortal(closedModal, document.body) : null}
    </>
  );
}

export default memo(MarketCard);
