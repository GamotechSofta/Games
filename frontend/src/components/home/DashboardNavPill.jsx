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
  { id: 'casino', labelKey: 'dashboard.catCasino', panel: 'casino', Icon: IconCasinoFilled },
];

export const FOCUSED_NAV_PANELS = ['markets', 'casino'];

export function panelToNavTab(panel) {
  if (panel === 'casino' || panel === 'skills') return 'casino';
  if (panel === 'markets') return 'markets';
  if (panel === 'home') return 'home';
  return 'home';
}

export default function DashboardNavPill({ activePanel, onPanelChange }) {
  const { t } = useTranslation();
  const activeTab = panelToNavTab(activePanel);

  return (
    <nav
      className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-100 px-2 py-1.5 font-sans dark:border-white/[0.06] dark:bg-[#1a1a1a]"
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
            className="flex items-center justify-center px-2 py-0.5 transition-all"
            aria-label={t(tab.labelKey)}
            aria-current={active ? 'page' : undefined}
          >
            <span
              className={[
                'flex h-9 w-9 items-center justify-center rounded-[10px] transition-all',
                active
                  ? 'bg-[#D32F2F] text-white shadow-[0_0_12px_rgba(211,47,47,0.4)] dark:bg-[#e60000] dark:shadow-[0_0_14px_rgba(230,0,0,0.45)]'
                  : 'text-gray-500 hover:text-[#D32F2F] dark:text-[#b0b0b0] dark:hover:text-red-400',
              ].join(' ')}
            >
              <Icon className={ICON_SIZE_NAV} />
            </span>
          </button>
        );
      })}
    </nav>
  );
}
