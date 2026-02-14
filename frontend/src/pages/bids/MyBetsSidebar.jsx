import React from 'react';
import MenuItemCard from '../../components/MenuItemCard';

/**
 * Sidebar menu for My Bets screen (Bet History, Game Results, Starline Bet History, King Bazaar Bet History).
 */
export default function MyBetsSidebar({ items = [], activeTitle, onItemClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3 md:gap-2.5 min-w-0 w-full">
      {items.map((item) => (
        <MenuItemCard
          key={item.title}
          title={item.title}
          subtitle={item.subtitle}
          color={item.color}
          iconUrl={item.iconUrl}
          active={item.title === activeTitle}
          onClick={() => onItemClick(item)}
          compactOnDesktop
        />
      ))}
    </div>
  );
}
