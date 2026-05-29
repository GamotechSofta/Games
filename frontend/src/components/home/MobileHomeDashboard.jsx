import React, { Suspense, lazy, memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMiniArrowRight } from 'react-icons/hi2';
import {
  MdLocalFireDepartment,
} from 'react-icons/md';
import { HOME_QUICK_LINKS } from '../../config/homeAssets';
import OptimizedImage from '../OptimizedImage';
import ResponsiveCloudinaryImage from '../ResponsiveCloudinaryImage';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { useTheme } from '../../context/ThemeContext';
import { useRefreshOnMarketReset } from '../../hooks/useRefreshOnMarketReset';
import useMainMarkets from '../../hooks/useMainMarkets';
import MarketCard from '../MarketCard';

const PopularCasinoSection = lazy(() => import('./PopularCasinoSection'));

const MOBILE_HOME_BANNERS = [
  {
    src: optimizeCloudinaryUrl('https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png'),
    alt: 'Black Orange Gaming Banner',
  },
  {
    src: optimizeCloudinaryUrl('https://res.cloudinary.com/dnyp5jknp/image/upload/v1771503014/Black_Gold_Modern_Casino_Night_Party_Facebook_Cover_1545_x_900_px_1080_x_547_px_1_ooz3sj.png'),
    alt: 'Black Gold Casino Night Banner',
  },
];

const QUICK_LINKS = [
  {
    id: 'casino',
    label: 'Casino',
    icon: CasinoChipIcon,
    path: '/games?category=highEarning',
    image: HOME_QUICK_LINKS.casino,
    iconColor: '#d58cff',
    darkCardClass:
      'border-[#6a3d8e] bg-[linear-gradient(135deg,#2b1438_0%,#17111f_52%,#0d0c14_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(141,88,184,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#dcc6ef] bg-[linear-gradient(135deg,#ffffff_0%,#fcf7ff_52%,#f3e8ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(120,84,158,0.12)]',
    darkIconClass:
      'border-[#8d58b8]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(213,140,255,0.42),rgba(67,31,95,0.96))]',
    lightIconClass:
      'border-[#d8b4fe] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(233,213,255,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: MarketsIcon,
    path: '/markets',
    active: true,
    image: HOME_QUICK_LINKS.markets,
    iconColor: '#ff5a52',
    darkCardClass:
      'border-[#8f2a2a] bg-[linear-gradient(135deg,#371015_0%,#211012_52%,#110b0c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(182,60,60,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#f4c1c1] bg-[linear-gradient(135deg,#ffffff_0%,#fff5f5_52%,#ffe7e7_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(219,74,74,0.12)]',
    darkIconClass:
      'border-[#b63c3c]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,94,94,0.46),rgba(85,19,19,0.96))]',
    lightIconClass:
      'border-[#fca5a5] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(254,226,226,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
  {
    id: 'starline',
    label: 'Starline',
    icon: StarlineIcon,
    path: '/startline-dashboard',
    image: HOME_QUICK_LINKS.starline,
    iconColor: '#ffd75a',
    darkCardClass:
      'border-[#8b6a1d] bg-[linear-gradient(135deg,#3a2b10_0%,#241d10_52%,#13100b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(185,146,46,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#f2d89f] bg-[linear-gradient(135deg,#ffffff_0%,#fff9eb_52%,#fff3d6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(199,155,53,0.12)]',
    darkIconClass:
      'border-[#b9922e]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,215,90,0.42),rgba(100,73,14,0.96))]',
    lightIconClass:
      'border-[#facc15] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(254,243,199,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
  {
    id: 'king-bazaar',
    label: 'King Bazaar',
    icon: CrownIcon,
    path: '/king-bazaar-market',
    image: HOME_QUICK_LINKS.kingBazaar,
    iconColor: '#ffb149',
    darkCardClass:
      'border-[#8f5a1d] bg-[linear-gradient(135deg,#392110_0%,#24170f_52%,#120d0c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(188,120,48,0.18),0_10px_24px_rgba(0,0,0,0.32)]',
    lightCardClass:
      'border-[#f0c28e] bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_52%,#ffe8cc_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(206,128,38,0.12)]',
    darkIconClass:
      'border-[#bc7830]/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,177,73,0.38),rgba(92,52,15,0.96))]',
    lightIconClass:
      'border-[#fdba74] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.98),rgba(255,237,213,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
  },
];

const MARKET_CARD_GRID_CLASS =
  'relative h-[150px] w-full min-w-0 overflow-hidden rounded-[22px] bg-[#180707] min-[375px]:h-[158px] min-[430px]:h-[164px] min-[640px]:h-[170px]';
const MARKET_CARD_SKELETON_BASE_CLASS =
  'rounded-[24px] border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-[#151515]';
const ALL_MARKETS_GRID_CLASS =
  'grid grid-cols-2 gap-2.5 pb-1 md:grid-cols-5 md:gap-3';

const toMarketNameKey = (name) =>
  (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());

function MarketsIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 18V11" strokeLinecap="round" />
      <path d="M12 18V7" strokeLinecap="round" />
      <path d="M19 18V4" strokeLinecap="round" />
      <path d="M4 19.5h16" strokeLinecap="round" />
    </svg>
  );
}

function StarlineIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.7l2.58 5.23 5.77.84-4.18 4.08.98 5.75L12 15.86 6.85 18.6l.98-5.75L3.65 8.77l5.77-.84L12 2.7z" />
    </svg>
  );
}

function CasinoChipIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5v3.1M12 17.4v3.1M20.5 12h-3.1M6.6 12H3.5M17.85 6.15l-2.2 2.2M8.35 15.65l-2.2 2.2M17.85 17.85l-2.2-2.2M8.35 8.35l-2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CrownIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 18.5h16l-1.15-8.26-4.23 3.2L12 5.5l-2.62 7.94-4.23-3.2L4 18.5zm3.5-2h9a1 1 0 100-2h-9a1 1 0 100 2z" />
    </svg>
  );
}

function SectionHeader({ icon: Icon, iconClassName, title, actionLabel, onAction }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClassName}`} />
        <h2 className="text-[15px] font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h2>
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#e53935] dark:text-[#ff726b]"
        >
          {actionLabel}
          <HiMiniArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function QuickAccessTile({ item, onClick, isLight }) {
  const Icon = item.icon;
  const cardClass = isLight ? item.lightCardClass : item.darkCardClass;
  const iconShellClass = isLight ? item.lightIconClass : item.darkIconClass;
  const titleStyle = isLight ? { color: '#1f2937' } : { color: '#ffffff' };
  const iconStyle = { color: item.iconColor };

  if (item.image) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative block w-full min-w-0 overflow-hidden rounded-[18px] text-left transition active:scale-[0.98]"
      >
        <OptimizedImage
          webp={item.image.webp}
          png={item.image.png}
          alt={item.label}
          loading="lazy"
          className="block h-auto w-full rounded-[18px] object-contain"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-[18px] border px-3 py-2.5 text-left transition active:scale-[0.98] ${cardClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isLight
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.18)_42%,rgba(255,255,255,0.04))]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent_42%,rgba(0,0,0,0.22))]'
        }`}
      />
      <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(0,0,0,0.22)] ${iconShellClass}`}>
        <Icon className="h-5 w-5" style={iconStyle} />
      </span>
      <span className="relative z-10 min-w-0 flex-1 truncate text-[10.5px] font-semibold" style={titleStyle}>
        {item.label}
      </span>
      <span
        className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          isLight ? 'border-black/10 bg-white/80 shadow-[0_4px_10px_rgba(15,23,42,0.08)]' : 'bg-black/12'
        }`}
        style={isLight ? { color: item.iconColor } : { color: item.iconColor, borderColor: `${item.iconColor}88` }}
      >
        <HiMiniArrowRight className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}

function HeroBanner({ t, navigate, index, setIndex, isLight }) {
  useEffect(() => {
    if (MOBILE_HOME_BANNERS.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % MOBILE_HOME_BANNERS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [setIndex]);

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {MOBILE_HOME_BANNERS.map((banner, bannerIndex) => (
          <div key={banner.src} className="relative w-full shrink-0 basis-full overflow-hidden">
            <ResponsiveCloudinaryImage
              src={banner.src}
              alt={banner.alt}
              className="block w-full h-auto object-contain opacity-95 dark:opacity-85"
              sizes="100vw"
              widths={[320, 420, 540, 640, 750, 960]}
              loading={bannerIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={bannerIndex === 0 ? 'high' : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileHomeDashboard() {
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const { markets, loading, refetch } = useMainMarkets();

  useRefreshOnMarketReset(refetch);

  const popularMarkets = useMemo(() => markets.filter((market) => market.showInPopular), [markets]);

  return (
    <div className="w-full pb-8">
      <HeroBanner t={t} navigate={navigate} index={heroIndex} setIndex={setHeroIndex} isLight={isLight} />

      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-2.5 pt-3 min-[375px]:px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="grid grid-cols-2 gap-2 pt-0.5 min-[375px]:gap-2.5 min-[480px]:gap-3">
          {QUICK_LINKS.map((item) => (
            <QuickAccessTile key={item.id} item={item} onClick={() => navigate(item.path)} isLight={isLight} />
          ))}
        </div>

        <Suspense fallback={<div className="h-[176px] rounded-[15px] bg-white/70 dark:bg-white/10 animate-pulse" aria-hidden />}>
          <PopularCasinoSection onSelect={(path) => navigate(path)} />
        </Suspense>

        {(loading || popularMarkets.length > 0) && (
          <div>
            <SectionHeader
              icon={MdLocalFireDepartment}
              iconClassName="text-[#ff5a52]"
              title={t('dashboard.popularMarkets', { defaultValue: 'Popular Markets' })}
              actionLabel={t('dashboard.viewAll', { defaultValue: 'View All' })}
              onAction={() => navigate('/markets')}
            />
            {loading ? (
              <div className={ALL_MARKETS_GRID_CLASS}>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className={`${MARKET_CARD_GRID_CLASS} ${MARKET_CARD_SKELETON_BASE_CLASS}`}
                  />
                ))}
              </div>
            ) : (
              <div className={ALL_MARKETS_GRID_CLASS}>
                {popularMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <SectionHeader
            icon={MarketsIcon}
            iconClassName="text-[#f59e0b]"
            title={t('dashboard.allMarkets', { defaultValue: 'All Markets' })}
          />
          {loading ? (
            <div className={ALL_MARKETS_GRID_CLASS}>
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={`${MARKET_CARD_GRID_CLASS} ${MARKET_CARD_SKELETON_BASE_CLASS}`}
                />
              ))}
            </div>
          ) : (
            <div className={ALL_MARKETS_GRID_CLASS}>
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
