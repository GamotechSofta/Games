import React, { memo } from 'react';
import { HiMiniChevronRight } from 'react-icons/hi2';
import { KING_BAZAAR_BUTTON_BG, KING_BAZAAR_ICON } from '../../config/homeAssets';

/**
 * Premium home category tile — gold frame, gradient fill, glowing icon (CSS only).
 */
function GoldFrame({ children }) {
  return (
    <div
      className="relative h-full w-full rounded-[11px] p-[1.5px] shadow-[0_2px_10px_rgba(0,0,0,0.4)] sm:rounded-[15px] sm:p-[2px] sm:shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
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
                  backgroundColor: '#050505',
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
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-black/45"
              aria-hidden
            />
          ) : (
            <>
              {/* Horizontal light flare */}
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
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center min-[375px]:h-9 min-[375px]:w-9 sm:h-11 sm:w-11 md:h-12 md:w-12">
              <img
                src={theme.iconImage}
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
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

export const HOME_CATEGORY_THEMES = {
  casino: {
    cardBg:
      'linear-gradient(90deg, #0f0618 0%, #1f0f32 28%, #4a1f78 50%, #1f0f32 72%, #0f0618 100%)',
    flare: 'rgba(168, 85, 247, 0.22)',
    flareStrong: 'rgba(196, 132, 252, 0.38)',
    iconBg: 'radial-gradient(circle at 32% 28%, #e9d5ff 0%, #9333ea 42%, #4c1d95 100%)',
    iconBorder: 'rgba(216, 180, 254, 0.75)',
    iconGlow: '0 0 16px rgba(168, 85, 247, 0.75), 0 0 32px rgba(124, 58, 237, 0.45)',
    iconColor: '#ffffff',
    labelColor: '#ffffff',
    chevronBg: 'rgba(88, 28, 135, 0.55)',
    chevronBorder: 'rgba(216, 180, 254, 0.45)',
    chevronColor: '#f3e8ff',
    chevronGlow: '0 0 10px rgba(168, 85, 247, 0.35)',
  },
  markets: {
    cardBg:
      'linear-gradient(90deg, #140608 0%, #3a0f14 28%, #7a1a22 50%, #3a0f14 72%, #140608 100%)',
    flare: 'rgba(248, 113, 113, 0.2)',
    flareStrong: 'rgba(252, 165, 165, 0.34)',
    iconBg: 'radial-gradient(circle at 32% 28%, #fecaca 0%, #dc2626 45%, #7f1d1d 100%)',
    iconBorder: 'rgba(252, 165, 165, 0.7)',
    iconGlow: '0 0 16px rgba(239, 68, 68, 0.7), 0 0 30px rgba(185, 28, 28, 0.45)',
    iconColor: '#ffffff',
    labelColor: '#ffffff',
    chevronBg: 'rgba(127, 29, 29, 0.55)',
    chevronBorder: 'rgba(252, 165, 165, 0.4)',
    chevronColor: '#fee2e2',
    chevronGlow: '0 0 10px rgba(239, 68, 68, 0.35)',
  },
  starline: {
    cardBg:
      'linear-gradient(90deg, #1a1204 0%, #3d2c08 28%, #8b6914 50%, #3d2c08 72%, #1a1204 100%)',
    flare: 'rgba(250, 204, 21, 0.22)',
    flareStrong: 'rgba(253, 224, 71, 0.38)',
    waveOverlay:
      'repeating-linear-gradient(105deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 10px)',
    iconBg: 'radial-gradient(circle at 32% 28%, #fef08a 0%, #eab308 42%, #854d0e 100%)',
    iconBorder: 'rgba(253, 224, 71, 0.75)',
    iconGlow: '0 0 16px rgba(234, 179, 8, 0.75), 0 0 32px rgba(180, 83, 9, 0.45)',
    iconColor: '#422006',
    labelColor: '#ffffff',
    chevronBg: 'rgba(113, 63, 18, 0.55)',
    chevronBorder: 'rgba(253, 224, 71, 0.42)',
    chevronColor: '#fef9c3',
    chevronGlow: '0 0 10px rgba(234, 179, 8, 0.35)',
  },
  kingBazaar: {
    cardBgImage: KING_BAZAAR_BUTTON_BG,
    iconImage: KING_BAZAAR_ICON,
    cardBg:
      'linear-gradient(90deg, #1a1004 0%, #3d2608 28%, #b8860b 50%, #3d2608 72%, #1a1004 100%)',
    flare: 'rgba(251, 191, 36, 0.24)',
    flareStrong: 'rgba(252, 211, 77, 0.42)',
    iconBg: 'radial-gradient(circle at 32% 28%, #fde68a 0%, #f59e0b 40%, #92400e 100%)',
    iconBorder: 'rgba(253, 230, 138, 0.8)',
    iconGlow: '0 0 18px rgba(245, 158, 11, 0.8), 0 0 34px rgba(180, 83, 9, 0.5)',
    iconColor: '#422006',
    labelColor: '#ffffff',
    chevronBg: 'rgba(120, 53, 15, 0.55)',
    chevronBorder: 'rgba(253, 230, 138, 0.45)',
    chevronColor: '#fffbeb',
    chevronGlow: '0 0 10px rgba(245, 158, 11, 0.4)',
  },
};

export default memo(HomeCategoryCard);
