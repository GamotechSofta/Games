import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_TAB_OPTIONS = [
  { id: 'all', labelKey: 'bids.filterAll' },
  { id: 'won', labelKey: 'bids.status.win' },
  { id: 'lost', labelKey: 'bids.status.lost' },
];

const TAB_IDLE =
  'border-gray-200 bg-white text-gray-700 hover:border-red-300 dark:border-white/15 dark:bg-[#202124] dark:text-gray-300 dark:hover:border-red-500/40';

function getTabActiveClass(id) {
  if (id === 'won') {
    return 'border-green-600 bg-green-50 text-green-700 dark:bg-green-500/15 dark:border-green-500 dark:text-green-300 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]';
  }
  if (id === 'lost') {
    return 'border-red-600 bg-red-50 text-red-700 dark:bg-red-500/15 dark:border-red-500 dark:text-red-300 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]';
  }
  return 'border-red-600 bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-200 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]';
}

export default function BetHistoryStatusTabs({ activeFilter, onChange, className = '', size = 'sm' }) {
  const { t } = useTranslation();
  const btnSize =
    size === 'md'
      ? 'px-3.5 py-2 text-xs font-bold uppercase tracking-wide sm:px-4 sm:text-sm'
      : 'px-3.5 py-2 text-xs font-bold uppercase tracking-wide sm:px-4 sm:text-sm';

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
