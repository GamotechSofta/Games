import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMarketImageUrl } from '../config/marketCardThemes';

const toMarketNameKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
};

const POPULAR_MARKET_CARD_CLOSED_IMAGE = '/images/home/popular-markets-table.png';
const POPULAR_MARKET_CARD_OPEN_IMAGE = '/images/home/popular-markets-table-open.png';

export default function MarketCard({ market, imageShape = 'round' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isOpen = market.status === 'open' || market.status === 'running';
  const isClickable = isOpen;
  const imageUrl = getMarketImageUrl(market.gameName);
  const useSquareImage = imageShape === 'square';

  const handleClick = () => {
    if (isClickable) {
      navigate('/bidoptions', { state: { market } });
    }
  };

  const handleTomorrow = (e) => {
    e.stopPropagation();
    navigate('/bidoptions', { state: { market, scheduleForTomorrow: true } });
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
  const cardImage = isOpen ? POPULAR_MARKET_CARD_OPEN_IMAGE : POPULAR_MARKET_CARD_CLOSED_IMAGE;
  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isOpen) {
      handleClick();
      return;
    }
    handleTomorrow(e);
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && handleClick()}
      className={`relative flex h-full min-h-[168px] w-full flex-col overflow-hidden rounded-[24px] bg-[#180707] transition-all duration-200 sm:min-h-[176px] ${
        isClickable
          ? 'cursor-pointer hover:-translate-y-0.5'
          : ''
      }`}
    >
      <img
        src={cardImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,11,8,0.08)_0%,rgba(35,9,8,0.42)_32%,rgba(18,5,5,0.76)_64%,rgba(8,3,3,0.94)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,187,118,0.18),transparent)]" />
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt=""
            className={`absolute top-6 object-cover opacity-[0.16] blur-[1px] ${
              useSquareImage
                ? 'right-3 h-[74px] w-[74px] rounded-[18px]'
                : '-right-4 h-[74px] w-[74px] rounded-full'
            }`}
            aria-hidden
          />
          <div
            className={`absolute top-4 h-[92px] w-[92px] bg-[#ffbf78]/10 blur-2xl ${
              useSquareImage ? 'right-1 rounded-[24px]' : '-right-2 rounded-full'
            }`}
          />
        </>
      ) : null}

      <div className="relative z-10 flex h-full flex-col p-3.5">
        <div className="flex justify-center pt-8">
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase leading-none tracking-[0.12em] min-[380px]:text-[8px] ${badgeStyle}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-auto">
          <div className="mb-1 text-center text-[11px] font-semibold leading-[1.15] text-[#ffdca8]/78">
            {market.timeRange}
          </div>
          <div className="mb-2 whitespace-nowrap text-center text-[14px] font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {displayName}
          </div>
          <div className="px-0.5 text-center">
            <div className="whitespace-nowrap text-[18px] font-black leading-none tracking-[0.06em] text-[#ffc84d] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              {resultValue}
            </div>
          </div>
          <div className="relative mt-3">
            <button
              type="button"
              onClick={handleActionClick}
              className={`relative z-10 block w-full overflow-hidden text-center text-[11px] font-bold ${
                market.status === 'closed' ? 'text-red-300' : 'text-white/92'
              }`}
            >
              <span className="block whitespace-nowrap">
                {market.status === 'closed'
                  ? t('markets.runningForTomorrow')
                  : t('markets.tapToPlay', { defaultValue: 'Tap to Play' })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
