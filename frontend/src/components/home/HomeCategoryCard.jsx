import React, { memo } from 'react';
import { HiMiniChevronRight } from 'react-icons/hi2';
import {
  CASINO_BUTTON_BG,
  CASINO_ICON,
  KING_BAZAAR_BUTTON_BG,
  KING_BAZAAR_ICON,
  MARKETS_BUTTON_BG,
  MARKETS_ICON,
  STARLINE_BUTTON_BG,
  STARLINE_ICON,
} from '../../config/homeAssets';
import {
  CasinoCategoryIcon,
  MarketsCategoryIcon,
  StarlineCategoryIcon,
  KingBazaarCategoryIcon,
} from './homeCategoryIcons';

/**
 * Premium home category tile — gold frame, gradient fill, glowing icon (CSS only).
 */
function GoldFrame({ children }) {
  return (
    <div
      className="relative h-full w-full rounded-[11px] px-[1.5px] pt-[1.5px] pb-[0.5px] shadow-[0_2px_10px_rgba(0,0,0,0.4)] sm:rounded-[15px] sm:px-[2px] sm:pt-[2px] sm:pb-[1px] sm:shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
      style={{
        background:
          'linear-gradient(145deg, #f7e7a8 0%, #d4af37 18%, #8b6914 42%, #e8c96a 68%, #f0d78c 88%, #c9a227 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-[9px] sm:rounded-[13px] [clip-path:polygon(7px_0%,calc(100%-7px)_0%,100%_7px,100%_calc(100%-7px),calc(100%-7px)_100%,7px_100%,0%_calc(100%-7px),0%_7px)] sm:[clip-path:polygon(10px_0%,calc(100%-10px)_0%,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0%_calc(100%-10px),0%_10px)]"
      >
        <div
          className="pointer-events-none absolute inset-[2px] rounded-[7px] border border-[rgba(212,175,55,0.28)] sm:inset-[3px] sm:rounded-[10px]"
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}

function HomeCategoryCard({ label, Icon, theme, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="group relative block h-full w-full min-w-0 text-left transition-transform duration-200 active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <GoldFrame>
        <div
          className="relative flex min-h-[44px] w-full items-center gap-1.5 px-2 py-1.5 min-[375px]:min-h-[48px] min-[375px]:gap-2 sm:min-h-[58px] sm:gap-2.5 sm:px-2.5 sm:py-2.5 md:min-h-[62px] md:px-3 md:py-2.5 lg:min-h-[66px]"
          style={
            theme.cardBgImage
              ? {
                  backgroundColor: '#0a0806',
                  backgroundImage: `url(${theme.cardBgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }
              : { background: theme.cardBg }
          }
        >
          {theme.cardBgImage ? (
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/35"
              aria-hidden
            />
          ) : (
            <>
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${theme.flare} 42%, ${theme.flareStrong || theme.flare} 50%, ${theme.flare} 58%, transparent 100%)`,
                }}
                aria-hidden
              />
              {theme.waveOverlay ? (
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage: theme.waveOverlay,
                    backgroundSize: '120% 100%',
                  }}
                  aria-hidden
                />
              ) : null}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 38%, rgba(0,0,0,0.28) 100%)',
                }}
                aria-hidden
              />
            </>
          )}

          {/* Icon */}
          {theme.iconImage ? (
            <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center min-[375px]:h-10 min-[375px]:w-10 sm:h-12 sm:w-12 md:h-[52px] md:w-[52px]">
              <img
                src={theme.iconImage}
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
                loading="lazy"
                decoding="async"
              />
            </span>
          ) : (
            <span
              className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border min-[375px]:h-8 min-[375px]:w-8 sm:h-10 sm:w-10 sm:border-2 md:h-11 md:w-11"
              style={{
                background: theme.iconBg,
                borderColor: theme.iconBorder,
                boxShadow: theme.iconGlow,
              }}
            >
              <Icon
                className="h-3.5 w-3.5 min-[375px]:h-4 min-[375px]:w-4 sm:h-5 sm:w-5 md:h-[22px] md:w-[22px]"
                style={{ color: theme.iconColor }}
              />
            </span>
          )}

          {/* Label */}
          <span
            className="relative z-10 min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] min-[375px]:text-[11px] sm:text-[13px] md:text-sm lg:text-[15px]"
            style={{ color: theme.labelColor }}
          >
            {label}
          </span>

          {/* Chevron */}
          <span
            className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border sm:h-7 sm:w-7"
            style={{
              background: theme.chevronBg,
              borderColor: theme.chevronBorder,
              color: theme.chevronColor,
              boxShadow: theme.chevronGlow,
            }}
          >
            <HiMiniChevronRight className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={2.5} />
          </span>
        </div>
      </GoldFrame>
    </button>
  );
}

const KING_STYLE_CHEVRON = {
  chevronBg: 'rgba(120, 53, 15, 0.55)',
  chevronBorder: 'rgba(253, 230, 138, 0.45)',
  chevronColor: '#fffbeb',
  chevronGlow: '0 0 10px rgba(245, 158, 11, 0.4)',
};

/** Shared premium gold-card UI (all four home category tiles). */
const PREMIUM_GOLD_CARD_STYLE = {
  labelColor: '#ffffff',
  ...KING_STYLE_CHEVRON,
};

export const HOME_CATEGORY_THEMES = {
  casino: {
    ...PREMIUM_GOLD_CARD_STYLE,
    cardBgImage: CASINO_BUTTON_BG,
    iconImage: CASINO_ICON,
  },
  markets: {
    ...PREMIUM_GOLD_CARD_STYLE,
    cardBgImage: MARKETS_BUTTON_BG,
    iconImage: MARKETS_ICON,
  },
  starline: {
    ...PREMIUM_GOLD_CARD_STYLE,
    cardBgImage: STARLINE_BUTTON_BG,
    iconImage: STARLINE_ICON,
  },
  kingBazaar: {
    ...PREMIUM_GOLD_CARD_STYLE,
    cardBgImage: KING_BAZAAR_BUTTON_BG,
    iconImage: KING_BAZAAR_ICON,
  },
};

export const HOME_CATEGORY_ICONS = {
  casino: CasinoCategoryIcon,
  markets: MarketsCategoryIcon,
  starline: StarlineCategoryIcon,
  kingBazaar: KingBazaarCategoryIcon,
};

export default memo(HomeCategoryCard);
