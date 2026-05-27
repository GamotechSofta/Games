import React from 'react';
import { useTranslation } from 'react-i18next';
import MyBetsMenuCard from './MyBetsMenuCard';

/**
 * My Bets hub menu — full-width cards on mobile (readable text), sidebar list on desktop.
 */
export default function MyBetsSidebar({ items = [], activeTitle, onItemClick }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full max-w-full">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#d4af37] dark:text-amber-400 shrink-0">
        {t('bids.chooseSection')}
      </p>
      <div className="flex flex-col gap-2 min-w-0 w-full max-w-full md:gap-2">
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
            compactOnDesktop
          />
        ))}
      </div>
    </div>
  );
}
