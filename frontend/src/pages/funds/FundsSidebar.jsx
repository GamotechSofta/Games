import React from 'react';
import MenuItemCard from '../../components/MenuItemCard';

/**
 * Sidebar menu for Funds screen (Add Fund, Withdraw Fund, Bank Detail, etc.).
 */
export default function FundsSidebar({ items = [], activeKey, onItemClick }) {
  return (
    <div className="space-y-2 md:space-y-2.5">
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
