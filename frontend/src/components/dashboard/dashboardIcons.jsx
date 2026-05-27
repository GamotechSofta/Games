import React from 'react';
import {
  HiHome,
  HiCurrencyDollar,
  HiUser,
  HiGift,
  HiChatAlt2,
  HiDesktopComputer,
  HiClipboardList,
  HiCash,
  HiChartBar,
  HiLogout,
  HiChevronRight,
  HiChevronDown,
  HiChevronLeft,
  HiBell,
  HiDownload,
  HiPlus,
  HiDotsVertical,
} from 'react-icons/hi';

/** Filled nav/sidebar icons — light grey when idle */
export const ICON_SIZE = 'h-[22px] w-[22px] shrink-0';
export const ICON_SIZE_SM = 'h-[18px] w-[18px] shrink-0';
export const ICON_SIZE_NAV = 'h-[20px] w-[20px] shrink-0';

export const iconColorClass = (active) =>
  active
    ? 'text-gray-800 dark:text-[#d4d4d4]'
    : 'text-gray-500 dark:text-[#b0b0b0]';

export function DashboardIcon({ Icon, active, className = '', size = 'md' }) {
  if (!Icon) return null;
  const sizeClass =
    size === 'sm' ? ICON_SIZE_SM : size === 'nav' ? ICON_SIZE_NAV : ICON_SIZE;
  return (
    <Icon
      className={[sizeClass, iconColorClass(active), className].filter(Boolean).join(' ')}
      aria-hidden
    />
  );
}

/** Filled poker chip with spade */
export function IconCasinoFilled({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2.2a7.8 7.8 0 110 15.6 7.8 7.8 0 010-15.6z" />
      <path d="M12 7.2c-.9 0-1.6.7-1.6 1.6 0 .7.5 1.3 1.2 1.5-.7.2-1.2.8-1.2 1.5 0 .9.7 1.6 1.6 1.6s1.6-.7 1.6-1.6c0-.7-.5-1.3-1.2-1.5.7-.2 1.2-.8 1.2-1.5 0-.9-.7-1.6-1.6-1.6z" />
    </svg>
  );
}

/** Filled star — Starline */
export function IconStarlineFilled({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.7l2.58 5.23 5.77.84-4.18 4.08.98 5.75L12 15.86 6.85 18.6l.98-5.75L3.65 8.77l5.77-.84L12 2.7z" />
    </svg>
  );
}

/** Filled crown — King Bazaar */
export function IconKingBazaarFilled({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 18.5h16l-1.15-8.26-4.23 3.2L12 5.5l-2.62 7.94-4.23-3.2L4 18.5zm3.5-2h9a1 1 0 100-2h-9a1 1 0 100 2z" />
    </svg>
  );
}

/** Filled soccer ball */
export function IconSportsFilled({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path
        fill="#111111"
        fillOpacity="0.35"
        d="M12 4l2.2 4.5L19 9.5l-3.5 3.4.8 4.9L12 15.8 7.7 17.8l.8-4.9L5 9.5l4.8-1L12 4z"
      />
      <path
        fill="#111111"
        fillOpacity="0.2"
        d="M8 12h8M12 8v8"
        stroke="#111111"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export {
  HiHome,
  HiCurrencyDollar,
  HiUser,
  HiGift,
  HiChatAlt2,
  HiDesktopComputer,
  HiClipboardList,
  HiCash,
  HiChartBar,
  HiLogout,
  HiChevronRight,
  HiChevronDown,
  HiChevronLeft,
  HiBell,
  HiDownload,
  HiPlus,
  HiDotsVertical,
};
