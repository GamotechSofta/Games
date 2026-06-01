import React, { memo, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMiniArrowRight } from 'react-icons/hi2';
import {
  MdLocalFireDepartment,
} from 'react-icons/md';
import ResponsiveCloudinaryImage from '../ResponsiveCloudinaryImage';
import HomeCategoryCard, { HOME_CATEGORY_ICONS, HOME_CATEGORY_THEMES } from './HomeCategoryCard';
import { MarketsCategoryIcon } from './homeCategoryIcons';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { useTheme } from '../../context/ThemeContext';
import { useRefreshOnMarketReset } from '../../hooks/useRefreshOnMarketReset';
import useMainMarkets from '../../hooks/useMainMarkets';
import MarketCard from '../MarketCard';

const MOBILE_HOME_BANNERS = [
  {
    src: optimizeCloudinaryUrl('https://res.cloudinary.com/dnyp5jknp/image/upload/v1771501969/Black_Orange_Minimalis_Offline_Gaming_Banner_Landscape_1920_x_500_px_1080_x_547_px_npbht7.png'),
    alt: 'Black Orange Gaming Banner',
  },
  {
    src: optimizeCloudinaryUrl(
      'https://res.cloudinary.com/dnyp5jknp/image/upload/v1780305926/ChatGPT_Image_Jun_1_2026_02_55_07_PM_ker5ps.png',
    ),
    alt: 'Play and Win Real Money — Casino Banner',
  },
];

const QUICK_LINKS = [
  { id: 'casino', labelKey: 'dashboard.catCasino', path: '/games?category=highEarning' },
  { id: 'markets', labelKey: 'dashboard.catMarkets', path: '/games?category=highEarning' },
  { id: 'starline', labelKey: 'dashboard.catStarline', path: '/startline-dashboard' },
  { id: 'kingBazaar', labelKey: 'dashboard.catKingBazaar', path: '/king-bazaar-market' },
];

const MARKET_CARD_GRID_CLASS =
  'relative h-[150px] w-full min-w-0 overflow-hidden rounded-[22px] bg-[#180707] min-[375px]:h-[158px] min-[430px]:h-[164px] min-[640px]:h-[170px]';
const MARKET_CARD_SKELETON_BASE_CLASS =
  'rounded-[24px] border border-gray-200 bg-white skeleton-shimmer dark:border-white/10 dark:bg-[#151515]';
const ALL_MARKETS_GRID_CLASS =
  'grid grid-cols-2 gap-2.5 pb-1 md:grid-cols-5 md:gap-3';

/** Popular Markets on mobile: 2 rows, horizontal scroll — ~2.25 columns visible (peek on next). */
const POPULAR_MARKETS_MOBILE_SCROLL_CLASS =
  'scrollbar-hidden grid grid-flow-col grid-rows-2 auto-cols-[calc((100%-0.78125rem)/2.25)] gap-x-2.5 gap-y-2.5 overflow-x-auto pb-1 min-[375px]:gap-x-2.5 min-[375px]:gap-y-2.5';

const toMarketNameKey = (name) =>
  (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());

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
            <HomeCategoryCard
              key={item.id}
              label={t(item.labelKey)}
              Icon={HOME_CATEGORY_ICONS[item.id]}
              theme={HOME_CATEGORY_THEMES[item.id]}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>

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
              <div className={POPULAR_MARKETS_MOBILE_SCROLL_CLASS}>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className={`${MARKET_CARD_GRID_CLASS} ${MARKET_CARD_SKELETON_BASE_CLASS}`}
                  />
                ))}
              </div>
            ) : (
              <div className={POPULAR_MARKETS_MOBILE_SCROLL_CLASS}>
                {popularMarkets.map((market) => (
                  <div key={market.id} className="min-w-0 w-full">
                    <MarketCard market={market} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <SectionHeader
            icon={MarketsCategoryIcon}
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
