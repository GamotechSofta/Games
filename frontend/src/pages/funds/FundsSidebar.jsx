import React from 'react';
import MenuItemCard from '../../components/MenuItemCard';

/**
 * Sidebar menu for Funds screen (Add Fund, Withdraw Fund, Bank Detail, etc.).
 */
export default function FundsSidebar({ items = [], activeKey, onItemClick }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-2.5 min-w-0 w-full">
      {items.map((item) => (
        <MenuItemCard
          key={item.key}
          title={item.title}
          subtitle={item.subtitle}
          color={item.color}
          icon={item.icon}
          active={item.key === activeKey}
          onClick={() => onItemClick(item.key)}
        />
      ))}
    </div>
  );
}
