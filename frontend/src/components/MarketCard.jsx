import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineClock, HiOutlinePlay } from 'react-icons/hi';
import { HiStar } from 'react-icons/hi';
import { BsSuitSpadeFill, BsSuitHeartFill, BsSuitDiamondFill, BsSuitClubFill } from 'react-icons/bs';
import { MARKET_SECTION_THEME } from '../config/dashboardTheme';

const suitIcons = [BsSuitSpadeFill, BsSuitHeartFill, BsSuitDiamondFill, BsSuitClubFill];
const suitColors = ['text-gray-800 dark:text-gray-300', 'text-[#D32F2F] dark:text-[#e60000]', 'text-[#D32F2F] dark:text-[#e60000]', 'text-gray-800 dark:text-gray-300'];

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
    open: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/90 dark:text-green-400 dark:border-green-700/80',
    closed: 'bg-red-50 text-[#D32F2F] border-red-200 dark:bg-red-950/90 dark:text-red-400 dark:border-red-800/80',
  },
  live: {
    open: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/90 dark:text-green-400 dark:border-green-700/80',
    closed: 'bg-green-50/80 text-green-700 border-green-200 dark:bg-green-950/70 dark:text-green-500 dark:border-green-800/60',
  },
  night: {
    open: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/90 dark:text-blue-400 dark:border-blue-700/80',
    closed: 'bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-500 dark:border-blue-800/60',
  },
};

export default function MarketCard({ market, index = 0, section = 'popular' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = MARKET_SECTION_THEME[section] || MARKET_SECTION_THEME.popular;

  const isOpen = market.status === 'open' || market.status === 'running';
  const isClickable = isOpen;

  const SuitIcon = suitIcons[index % suitIcons.length];
  const suitColor = suitColors[index % suitColors.length];

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

  const badgeStyle = BADGE_STYLES[section]?.[isOpen ? 'open' : 'closed'] || BADGE_STYLES.popular.closed;
  const showPlayBtn = isOpen && theme.playBtn;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && handleClick()}
      className={`bg-white dark:bg-[#161616] rounded-xl border-2 overflow-hidden w-full h-full transition-all duration-200 ${theme.cardBorder} ${
        isClickable ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-black/50' : ''
      }`}
    >
      <div className="flex justify-center pt-3 pb-1 px-3">
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide border ${badgeStyle}`}>
          {market.status === 'open' && t('markets.marketIsOpen')}
          {market.status === 'running' && t('markets.closingIsRunning')}
          {market.status === 'closed' && t('markets.marketClosed')}
        </span>
      </div>

      <div className="px-3 pb-3 flex items-end justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1.5">
            <HiOutlineClock className="w-3.5 h-3.5 text-gray-400 dark:text-[#707070] shrink-0" />
            <span className="text-[11px] text-gray-500 dark:text-[#b0b0b0] font-medium truncate">
              {market.timeRange}
            </span>
          </div>

          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1.5 break-words">
            {displayName}
          </h3>

          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <HiStar key={s} className="w-3 h-3 text-amber-400" />
              ))}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-[#b0b0b0] font-medium">(4.8)</span>
          </div>

          {market.status === 'closed' ? (
            <button
              type="button"
              onClick={handleTomorrow}
              className={`text-[11px] font-semibold hover:underline text-left ${
                section === 'popular'
                  ? 'text-[#D32F2F] dark:text-[#e60000]'
                  : `text-[#D32F2F] ${theme.action}`
              }`}
            >
              {t('markets.runningForTomorrow')}
            </button>
          ) : (
            <p className={`text-[11px] font-semibold text-green-600 ${theme.action}`}>
              {t('markets.tapToPlay')}
            </p>
          )}
        </div>

        <div className="shrink-0 mb-1">
          {showPlayBtn ? (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.playBtn}`}>
              <HiOutlinePlay className="w-5 h-5 text-gray-900 dark:text-white ml-0.5" />
            </div>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center">
              <SuitIcon className={`w-8 h-8 ${suitColor}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
