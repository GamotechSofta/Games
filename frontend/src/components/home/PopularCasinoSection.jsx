import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaDice, FaFireAlt, FaRocket, FaRegClock, FaThLarge, FaChessKing } from 'react-icons/fa';
import { MdLocalFireDepartment } from 'react-icons/md';
import { IconCasinoFilled } from '../dashboard/dashboardIcons';

const POPULAR_CASINO_TILES = [
  {
    id: 'popular',
    label: 'Popular',
    Icon: FaFireAlt,
    path: '/games?category=highEarning',
    accent: 'text-[#ff6b5c]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'live-casino',
    label: 'Live Casino',
    Icon: IconCasinoFilled,
    path: '/games?category=highEarning&q=live',
    accent: 'text-[#f4c37a]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,222,170,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'slots',
    label: 'Slots',
    Icon: FaDice,
    path: '/games?category=highEarning&q=slot',
    accent: 'text-[#ff5f5f]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'table-games',
    label: 'Table Games',
    Icon: FaChessKing,
    path: '/games?category=highEarning&q=table',
    accent: 'text-[#f4c37a]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'crash-games',
    label: 'Crash Games',
    Icon: FaRocket,
    path: '/games?category=highEarning&q=crash',
    accent: 'text-[#ff7a59]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'instant-games',
    label: 'Instant Games',
    Icon: FaRegClock,
    path: '/games?category=highEarning&q=instant',
    accent: 'text-[#f4c37a]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'poker',
    label: 'Poker',
    Icon: MdLocalFireDepartment,
    path: '/games?category=highEarning&q=poker',
    accent: 'text-[#ffb347]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
  {
    id: 'all-games',
    label: 'All Games',
    Icon: FaThLarge,
    path: '/games',
    accent: 'text-[#ffd46b]',
    shell: 'border-[#f0ae52]/60 bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,153,0.18),rgba(83,44,16,0.92))]',
  },
];

export default function PopularCasinoSection({ onSelect }) {
  const { t } = useTranslation();

  return (
    <div className="mb-5">
      <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
        {t('markets.casinoGames', { defaultValue: 'Casino Games' })}
      </h2>
      <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1">
        {POPULAR_CASINO_TILES.map((tile) => {
          const Icon = tile.Icon;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelect?.(tile.path)}
              className="group relative w-[96px] shrink-0 overflow-hidden rounded-[16px] border border-[#7c4d12] bg-[linear-gradient(180deg,#24180e_0%,#17110c_100%)] px-2.5 py-2 text-center shadow-[inset_0_1px_0_rgba(255,213,143,0.12)] transition hover:-translate-y-0.5"
            >
              <div className="pointer-events-none absolute inset-x-1.5 top-1.5 h-[1px] rounded-full bg-[#f3c46c]/55" />
              <div className="pointer-events-none absolute inset-x-1 bottom-1 h-8 rounded-[12px] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.34))]" />
              <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border ${tile.shell}`}>
                <Icon className={`h-5 w-5 ${tile.accent}`} />
              </div>
              <div className="mt-2 line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-tight text-white">
                {t(`casinoTiles.${tile.id}`, { defaultValue: tile.label })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
