import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  HiHome,
  HiCurrencyDollar,
  IconCasinoFilled,
  ICON_SIZE_NAV,
} from '../dashboard/dashboardIcons';

const NAV_TABS = [
  { id: 'home', labelKey: 'navigation.home', panel: 'home', Icon: HiHome },
  { id: 'markets', labelKey: 'dashboard.catMarkets', panel: 'markets', Icon: HiCurrencyDollar },
  { id: 'games', labelKey: 'sidebar.games', panel: 'games', Icon: IconCasinoFilled },
];

export const FOCUSED_NAV_PANELS = ['markets', 'games'];

export function panelToNavTab(panel) {
  if (panel === 'games' || panel === 'casino' || panel === 'skills') return 'games';
  if (panel === 'markets') return 'markets';
  if (panel === 'home') return 'home';
  return 'home';
}

export default function DashboardNavPill({ activePanel, onPanelChange }) {
  const { t } = useTranslation();
  const activeTab = panelToNavTab(activePanel);

  return (
    <nav
      className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-1.5 py-1 font-sans dark:border-white/[0.06] dark:bg-[#1a1a1a]"
      aria-label={t('navigation.home')}
    >
      {NAV_TABS.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.Icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onPanelChange?.(tab.panel)}
            className={[
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all',
              active
                ? 'bg-[#D32F2F] text-white shadow-[0_0_12px_rgba(211,47,47,0.4)] dark:bg-[#e60000] dark:shadow-[0_0_14px_rgba(230,0,0,0.45)]'
                : 'text-gray-600 hover:bg-white hover:text-[#D32F2F] dark:text-white dark:hover:bg-white/[0.06] dark:hover:text-white',
            ].join(' ')}
            aria-label={t(tab.labelKey)}
            aria-current={active ? 'page' : undefined}
          >
            <span
              className={[
                'flex h-8 w-8 items-center justify-center rounded-[9px] transition-all',
                active
                  ? 'bg-white/12 text-white'
                  : 'text-gray-500 dark:text-white',
              ].join(' ')}
            >
              <Icon className={ICON_SIZE_NAV} />
            </span>
            <span
              className={[
                'text-[13px] font-semibold leading-none whitespace-nowrap',
                active ? 'text-white' : 'text-inherit',
              ].join(' ')}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
