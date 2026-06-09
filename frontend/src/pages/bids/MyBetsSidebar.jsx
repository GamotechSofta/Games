import React from 'react';
import { useTranslation } from 'react-i18next';
import MyBetsMenuCard from './MyBetsMenuCard';

const NAV_THEMES = {
  gold: {
    active: 'border-[#d4af37] bg-amber-50/90 dark:bg-amber-950/50 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]',
    icon: 'bg-gradient-to-br from-[#d4af37] to-amber-600 text-black',
    dot: 'bg-[#d4af37]',
  },
  green: {
    active: 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.2)]',
    icon: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white',
    dot: 'bg-emerald-500',
  },
  red: {
    active: 'border-red-500 bg-red-50/90 dark:bg-red-950/40 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]',
    icon: 'bg-gradient-to-br from-red-500 to-red-700 text-white',
    dot: 'bg-red-500',
  },
  blue: {
    active: 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/40 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]',
    icon: 'bg-gradient-to-br from-blue-500 to-orange-500 text-white',
    dot: 'bg-blue-500',
  },
};

function CompactNavItem({ title, theme = 'gold', icon, active, onClick }) {
  const t = NAV_THEMES[theme] || NAV_THEMES.gold;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all ${
        active
          ? t.active
          : 'border-transparent hover:bg-gray-100/90 dark:hover:bg-white/5'
      }`}
    >
      <span className={`relative w-7 h-7 shrink-0 rounded-md flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 [&>img]:w-3.5 [&>img]:h-3.5 ${t.icon}`}>
        {icon}
        {active ? (
          <span className={`absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full ${t.dot}`} aria-hidden />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-gray-900 dark:text-white line-clamp-2">
        {title}
      </span>
    </button>
  );
}

/**
 * My Bets hub menu — full cards on mobile, compact icon+label nav on desktop.
 */
export default function MyBetsSidebar({ items = [], activeTitle, onItemClick }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full max-w-full">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37] dark:text-amber-400 shrink-0 md:text-[10px] md:mb-0.5">
        {t('bids.chooseSection')}
      </p>

      {/* Mobile: readable full cards */}
      <div className="flex flex-col gap-2 min-w-0 w-full max-w-full md:hidden">
        {items.map((item) => (
          <MyBetsMenuCard
            key={item.key || item.title}
            title={item.title}
            subtitle={item.subtitle}
            theme={item.theme}
            icon={item.icon}
            iconUrl={item.iconUrl}
            active={item.title === activeTitle}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>

      {/* Desktop: slim nav — more room for bet cards */}
      <nav className="hidden md:flex flex-col gap-0.5 min-w-0 w-full" aria-label={t('bids.chooseSection')}>
        {items.map((item) => (
          <CompactNavItem
            key={item.key || item.title}
            title={item.navLabel || item.title}
            theme={item.theme}
            icon={item.icon}
            active={item.title === activeTitle}
            onClick={() => onItemClick(item)}
          />
        ))}
      </nav>
    </div>
  );
}
