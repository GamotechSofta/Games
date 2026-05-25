import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiChevronRight, HiOutlineClock, HiOutlinePlay } from 'react-icons/hi';
import { MARKET_SECTION_THEME } from '../config/dashboardTheme';

const toMarketNameKey = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
};

const BADGE_STYLES = {
  popular: {
    open: 'bg-green-50 text-green-700 border-green-200 dark:bg-[#143524] dark:text-[#86efac] dark:border-[#1f7a45]',
    closed: 'bg-red-50 text-[#D32F2F] border-red-200 dark:bg-[#3a1216] dark:text-[#fca5a5] dark:border-[#b91c1c]',
  },
  live: {
    open: 'bg-green-50 text-green-700 border-green-200 dark:bg-[#143524] dark:text-[#86efac] dark:border-[#1f7a45]',
    closed: 'bg-green-50/80 text-green-700 border-green-200 dark:bg-[#1e2f25] dark:text-[#bbf7d0] dark:border-[#2f6d49]',
  },
  night: {
    open: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#12283f] dark:text-[#93c5fd] dark:border-[#2563eb]',
    closed: 'bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-[#1b2738] dark:text-[#bfdbfe] dark:border-[#315b8a]',
  },
};

export default function MarketCard({ market, section = 'popular' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = MARKET_SECTION_THEME[section] || MARKET_SECTION_THEME.popular;

  const isOpen = market.status === 'open' || market.status === 'running';
  const isClickable = isOpen;

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
  const badgeStyle = BADGE_STYLES[section]?.[isOpen ? 'open' : 'closed'] || BADGE_STYLES.popular.closed;
  const statusLabel =
    market.status === 'open'
      ? t('markets.marketIsOpen')
      : market.status === 'running'
        ? t('markets.closingIsRunning')
        : t('markets.marketClosed');

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && handleClick()}
      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 dark:border-white/[0.14] dark:bg-[#1f2023] dark:shadow-[0_14px_28px_rgba(0,0,0,0.24)] ${
        isClickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:hover:border-white/[0.2] dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.34)]'
          : ''
      }`}
    >
      <div className="flex flex-col items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-white/[0.08] sm:flex-row sm:items-center">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.14em] ${badgeStyle}`}>
          {statusLabel}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-white/72">
          <HiOutlineClock className="h-3.5 w-3.5 shrink-0" />
          <span className="break-words">{market.timeRange}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4">
        <div className="flex-1">
          <h3 className="break-words text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
            {displayName}
          </h3>

          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#18191c]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-white/50">
              Result
            </div>
            <div className="mt-1 break-all font-mono text-sm font-bold tracking-[0.12em] text-gray-900 dark:text-white sm:tracking-[0.22em]">
              {resultValue}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          {market.status === 'closed' ? (
            <button
              type="button"
              onClick={handleTomorrow}
              className={`max-w-[calc(100%-3.5rem)] text-left text-[11px] font-semibold leading-snug hover:underline ${
                section === 'popular'
                  ? 'text-[#D32F2F] dark:text-[#e60000]'
                  : `text-[#D32F2F] ${theme.action}`
              }`}
            >
              {t('markets.runningForTomorrow')}
            </button>
          ) : (
            <p className={`max-w-[calc(100%-3.5rem)] text-[11px] font-semibold leading-snug ${theme.action}`}>
              {t('markets.tapToPlay')}
            </p>
          )}

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              isOpen
                ? 'border-[#e60000]/20 bg-[#e60000] text-white shadow-[0_10px_24px_rgba(230,0,0,0.22)]'
                : 'border-gray-200 bg-white text-gray-400 dark:border-white/[0.1] dark:bg-[#18191c] dark:text-white/58'
            }`}
          >
            {isOpen ? (
              <HiOutlinePlay className="ml-0.5 h-5 w-5" />
            ) : (
              <HiChevronRight className="h-5 w-5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
