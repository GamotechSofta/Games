import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_TAB_OPTIONS = [
  { id: 'all', labelKey: 'bids.filterAll' },
  { id: 'won', labelKey: 'bids.status.win' },
  { id: 'lost', labelKey: 'bids.status.lost' },
  { id: 'cancelled', labelKey: 'bids.status.cancelled' },
];

const TAB_IDLE =
  'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-white/15 dark:bg-[#202124] dark:text-gray-300 dark:hover:border-white/30';

function getTabActiveClass(id) {
  if (id === 'won') {
    return 'border-green-600 bg-green-50 text-green-700 dark:bg-green-500/15 dark:border-green-500 dark:text-green-300 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]';
  }
  if (id === 'lost' || id === 'cancelled') {
    return 'border-red-600 bg-red-50 text-red-700 dark:bg-red-500/15 dark:border-red-500 dark:text-red-300 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]';
  }
  return 'border-gray-500 bg-gray-100 text-gray-800 dark:bg-white/10 dark:border-white/25 dark:text-gray-200 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]';
}

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
              isActive ? getTabActiveClass(tab.id) : TAB_IDLE
            }`}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
