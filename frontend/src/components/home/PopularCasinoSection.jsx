import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaChessKing, FaCircle, FaDice, FaRocket, FaThLarge } from 'react-icons/fa';
import { MdBolt, MdOutlineLiveTv } from 'react-icons/md';
import { IconCasinoFilled } from '../dashboard/dashboardIcons';

const POPULAR_CASINO_TILES = [
  {
    id: 'popular',
    label: 'Popular',
    path: '/games?category=highEarning',
    borderClass: 'border-[#7a46db]/70',
    shellClass: 'bg-[linear-gradient(180deg,#231132_0%,#100917_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_20%_22%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(135deg,#2b1245_0%,#1a1027_58%,#0f0a18_100%)]',
    variant: 'popular',
  },
  {
    id: 'live-casino',
    label: 'Live Casino',
    path: '/games?category=highEarning&q=live',
    borderClass: 'border-[#2f9b51]/70',
    shellClass: 'bg-[linear-gradient(180deg,#112414_0%,#0b140d_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,#18371f_0%,#122117_56%,#0b120d_100%)]',
    variant: 'live',
  },
  {
    id: 'slots',
    label: 'Slots',
    path: '/games?category=highEarning&q=slot',
    borderClass: 'border-[#ac2835]/70',
    shellClass: 'bg-[linear-gradient(180deg,#2f1116_0%,#160a0e_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_16%,rgba(255,180,98,0.14),transparent_24%),linear-gradient(135deg,#48111d_0%,#260f31_56%,#130a16_100%)]',
    variant: 'slots',
  },
  {
    id: 'table-games',
    label: 'Table Games',
    path: '/games?category=highEarning&q=table',
    borderClass: 'border-[#b63f2e]/70',
    shellClass: 'bg-[linear-gradient(180deg,#30160f_0%,#16100c_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(255,230,153,0.14),transparent_24%),linear-gradient(135deg,#542013_0%,#311119_56%,#160d12_100%)]',
    variant: 'table',
  },
  {
    id: 'crash-games',
    label: 'Crash Games',
    path: '/games?category=highEarning&q=crash',
    borderClass: 'border-[#337fc9]/70',
    shellClass: 'bg-[linear-gradient(180deg,#102332_0%,#0b131b_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_14%,rgba(255,91,73,0.16),transparent_20%),linear-gradient(135deg,#17344a_0%,#13283c_56%,#0b151f_100%)]',
    variant: 'crash',
  },
  {
    id: 'instant-games',
    label: 'Instant Games',
    path: '/games?category=highEarning&q=instant',
    borderClass: 'border-[#90753a]/70',
    shellClass: 'bg-[linear-gradient(180deg,#292511_0%,#14110b_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(255,214,92,0.14),transparent_24%),linear-gradient(135deg,#283513_0%,#182918_56%,#0c150d_100%)]',
    variant: 'instant',
  },
  {
    id: 'poker',
    label: 'Poker',
    path: '/games?category=highEarning&q=poker',
    borderClass: 'border-[#8e5baf]/70',
    shellClass: 'bg-[linear-gradient(180deg,#24142e_0%,#120d19_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(255,235,171,0.12),transparent_24%),linear-gradient(135deg,#341752_0%,#21172e_56%,#130d1b_100%)]',
    variant: 'poker',
  },
  {
    id: 'all-games',
    labelKey: 'markets.casinoGames',
    label: 'All Casino Games',
    path: '/games',
    borderClass: 'border-[#946125]/70',
    shellClass: 'bg-[linear-gradient(180deg,#2a1a0f_0%,#15100b_100%)]',
    visualClass: 'bg-[radial-gradient(circle_at_50%_18%,rgba(255,199,91,0.16),transparent_24%),linear-gradient(135deg,#41270e_0%,#28180c_56%,#16100b_100%)]',
    variant: 'all',
  },
];

function CasinoTileArtwork({ variant }) {
  switch (variant) {
    case 'popular':
      return (
        <div className="relative flex h-full items-center justify-center">
          <div className="absolute left-3 top-3 rotate-[-12deg] rounded-[10px] border border-white/25 bg-[#fff6eb] px-2.5 py-1.5 shadow-[0_10px_22px_rgba(0,0,0,0.26)]">
            <span className="text-[15px] font-black leading-none text-[#2a1111]">A</span>
          </div>
          <div className="absolute left-[30px] top-[12px] rotate-[10deg] rounded-[10px] border border-white/25 bg-[#f9ead9] px-2.5 py-1.5 shadow-[0_10px_22px_rgba(0,0,0,0.26)]">
            <span className="text-[15px] font-black leading-none text-[#2a1111]">K</span>
          </div>
          <div className="absolute bottom-4 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#ff9668]/45 bg-[radial-gradient(circle_at_30%_30%,#ffb267,#c03924)] shadow-[0_0_18px_rgba(255,102,71,0.32)]">
            <FaCircle className="h-3 w-3 text-white/90" />
          </div>
        </div>
      );
    case 'live':
      return (
        <div className="relative flex h-full items-center justify-center">
          <div className="absolute inset-x-4 top-3 bottom-6 rounded-[14px] bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.16),transparent_26%),linear-gradient(180deg,#245530_0%,#15311c_100%)] shadow-[0_12px_24px_rgba(0,0,0,0.2)]" />
          <div className="absolute bottom-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#f0c27a]/35 bg-[radial-gradient(circle_at_30%_30%,rgba(255,224,172,0.24),rgba(61,31,10,0.9))] shadow-[0_0_14px_rgba(240,194,122,0.18)]">
            <IconCasinoFilled className="h-5 w-5 text-[#f4d38b]" />
          </div>
        </div>
      );
    case 'slots':
      return (
        <div className="flex h-full items-center justify-center">
          <span className="rounded-[12px] border border-[#ff907d]/25 bg-[linear-gradient(180deg,rgba(255,146,92,0.2),rgba(85,16,32,0.24))] px-3 py-1.5 text-[22px] font-black tracking-[0.08em] text-[#ff7258] shadow-[0_0_14px_rgba(255,90,82,0.16)]">
            777
          </span>
        </div>
      );
    case 'table':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#e3a557] bg-[radial-gradient(circle_at_30%_30%,#8c1c11,#341317)] shadow-[0_0_16px_rgba(227,165,87,0.22)]">
            <div className="absolute h-6 w-6 rounded-full border border-[#f5d296]/70" />
            <div className="absolute h-2.5 w-2.5 rounded-full bg-[#f3c46c]" />
            <FaChessKing className="relative z-10 h-4 w-4 text-[#fff3dc]" />
          </div>
        </div>
      );
    case 'crash':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="relative rotate-[18deg]">
            <FaRocket className="h-10 w-10 text-[#f65547] drop-shadow-[0_0_10px_rgba(246,85,71,0.35)]" />
            <div className="absolute -bottom-1.5 left-2 h-4 w-4 rounded-full bg-[#ffb347]/30 blur-md" />
          </div>
        </div>
      );
    case 'instant':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#caa44a]/55 bg-[radial-gradient(circle_at_30%_30%,#f5d565,#7f5b10)] shadow-[0_0_14px_rgba(245,213,101,0.2)]">
            <MdBolt className="h-5.5 w-5.5 text-[#4e2b00]" />
          </div>
        </div>
      );
    case 'poker':
      return (
        <div className="relative flex h-full items-center justify-center">
          <div className="absolute left-3 top-3 rotate-[-10deg] rounded-[10px] border border-white/20 bg-[#fff7ef] px-2.5 py-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
            <span className="text-[14px] font-black leading-none text-[#2a1111]">A</span>
          </div>
          <div className="absolute left-[27px] top-[10px] rotate-[8deg] rounded-[10px] border border-white/20 bg-[#fff7ef] px-2.5 py-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
            <span className="text-[14px] font-black leading-none text-[#2a1111]">A</span>
          </div>
          <div className="absolute bottom-4 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#ffcf74]/45 bg-[radial-gradient(circle_at_30%_30%,#ffe3a3,#8c5e14)] shadow-[0_0_14px_rgba(255,192,92,0.18)]">
            <FaCircle className="h-3 w-3 text-[#6d2f0b]" />
          </div>
        </div>
      );
    case 'all':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="grid grid-cols-2 gap-1 rounded-[12px] border border-[#f3c46c]/30 bg-[linear-gradient(180deg,rgba(255,193,84,0.18),rgba(78,50,12,0.2))] p-3 shadow-[0_0_14px_rgba(255,193,84,0.16)]">
            {[0, 1, 2, 3].map((dot) => (
              <span key={dot} className="h-3.5 w-3.5 rounded-[3px] bg-[#f3c46c]" />
            ))}
          </div>
        </div>
      );
    default:
      return <IconCasinoFilled className="h-6 w-6 text-white" />;
  }
}

export default function PopularCasinoSection({ onSelect }) {
  const { t } = useTranslation();

  return (
    <div className="mb-5">
      <h2 className="mb-2 text-[13px] font-semibold text-gray-900 dark:text-white">
        {t('markets.casinoGames', { defaultValue: 'All Casino Games' })}
      </h2>
      <div className="scrollbar-hidden flex gap-3.5 overflow-x-auto pb-1 md:flex md:flex-nowrap md:gap-3 md:overflow-visible">
        {POPULAR_CASINO_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onSelect?.(tile.path)}
            className={`group relative h-[176px] w-[124px] shrink-0 overflow-hidden rounded-[15px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 min-[390px]:h-[184px] min-[390px]:w-[130px] md:h-[190px] md:min-w-0 md:flex-1 md:basis-0 ${tile.borderClass} ${tile.shellClass}`}
          >
            <div className={`absolute inset-0 ${tile.visualClass}`}>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_32%,rgba(0,0,0,0.38)_72%,rgba(0,0,0,0.72)_100%)]" />
              <CasinoTileArtwork variant={tile.variant} />
            </div>
            <div className="absolute inset-x-0 bottom-0 px-3.5 pb-4 pt-16 text-center">
              <div className="line-clamp-2 min-h-[54px] text-[12px] font-black uppercase leading-[0.96] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] min-[390px]:text-[13px]">
                {t(`casinoTiles.${tile.id}`, { defaultValue: tile.label })}
              </div>
              <div className="mt-2 text-[7.5px] font-medium uppercase tracking-[0.12em] text-white/60">
                {t('casinoTiles.provider', { defaultValue: 'Aakda Games' })}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
