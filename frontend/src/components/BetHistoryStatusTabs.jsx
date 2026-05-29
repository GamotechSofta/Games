import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_TAB_OPTIONS = [
  { id: 'all', labelKey: 'bids.filterAll' },
  { id: 'won', labelKey: 'bids.status.win' },
  { id: 'lost', labelKey: 'bids.status.lost' },
  { id: 'cancelled', labelKey: 'bids.status.cancelled' },
];

export default function BetHistoryStatusTabs({ activeFilter, onChange, className = '', size = 'sm' }) {
  const { t } = useTranslation();
  const btnSize =
    size === 'md'
      ? 'px-3 py-1.5 text-xs font-bold sm:text-sm'
      : 'px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:py-1.5 sm:text-xs';

  return (
    <div
      className={`flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hidden min-w-0 ${className}`}
      role="tablist"
      aria-label={t('bids.filterByStatus')}
    >
      {STATUS_TAB_OPTIONS.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-full border transition-colors touch-manipulation ${btnSize} ${
              isActive
                ? 'border-[#d4af37] bg-[#d4af37]/15 text-gray-900 dark:bg-[#d4af37]/20 dark:text-[#f2c14e] shadow-[0_0_0_1px_rgba(212,175,55,0.35)]'
                : 'border-gray-200 bg-white text-gray-700 hover:border-[#d4af37]/50 dark:border-white/15 dark:bg-[#202124] dark:text-gray-300 dark:hover:border-[#d4af37]/40'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
