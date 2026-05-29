import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { categoryPathActive } from '../utils/dashboardNav';
import { prefetchSpecialMarketChunks, prefetchSpecialMarketGroups } from '../api/prefetchSpecialMarkets';
import { useTranslation } from 'react-i18next';
import { HiOutlineMagnifyingGlass, HiOutlineAdjustmentsHorizontal, HiOutlineXMark } from 'react-icons/hi2';
import { HOME_BANNERS } from '../config/banners';
import { HOME_QUICK_LINKS } from '../config/homeAssets';
import OptimizedImage from './OptimizedImage';
import ResponsiveCloudinaryImage from './ResponsiveCloudinaryImage';

const CATEGORIES = [
  { id: 'casino', labelKey: 'dashboard.catCasino', path: '/games?category=highEarning', image: HOME_QUICK_LINKS.casino },
  { id: 'markets', labelKey: 'dashboard.catMarkets', path: '/markets', image: HOME_QUICK_LINKS.markets },
  { id: 'starline', labelKey: 'dashboard.catStarline', path: '/startline-dashboard', image: HOME_QUICK_LINKS.starline },
  { id: 'kingBazaar', labelKey: 'dashboard.catKingBazaar', path: '/king-bazaar-market', image: HOME_QUICK_LINKS.kingBazaar },
];

const panelClass =
  'rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-white/[0.06] dark:bg-[#1a1a1a]';

const controlPanelClass =
  'min-h-[44px] rounded-[18px] border border-gray-200 bg-white shadow-sm dark:border-white/[0.04] dark:bg-[#282828] dark:shadow-none';

export default function DashboardHero({ searchQuery = '', onSearchChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const primaryBanner = HOME_BANNERS[0];
  const secondaryBanner = HOME_BANNERS[1] || HOME_BANNERS[0];

  const handleCategory = (cat) => {
    if (!cat.path) return;
    if (cat.id === 'starline' || cat.id === 'kingBazaar') {
      prefetchSpecialMarketChunks();
      prefetchSpecialMarketGroups();
    }
    navigate(cat.path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    document.getElementById('market-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearSearch = () => {
    onSearchChange?.('');
  };

  return (
    <section className="mb-6 space-y-4">
      <div className="grid gap-3 lg:min-h-[220px] lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
        <button
          type="button"
          onClick={() => navigate('/funds?tab=add-fund')}
          className={`relative min-w-0 min-h-[180px] text-left ${panelClass} group transition sm:min-h-[220px] lg:min-h-0 lg:h-full hover:border-gray-300 dark:hover:border-white/[0.1]`}
        >
          <ResponsiveCloudinaryImage
            src={primaryBanner.src}
            alt={primaryBanner.alt || ''}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-90 transition group-hover:opacity-100"
            sizes="(max-width: 1024px) 100vw, 70vw"
            widths={[480, 640, 768, 960, 1200, 1440]}
            loading="eager"
            fetchPriority="high"
          />
          <div className="relative z-[1] flex h-full min-h-[180px] flex-col justify-end p-5 sm:min-h-[220px] sm:p-6 md:p-8 lg:min-h-0">
            <span className="inline-flex w-fit items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition group-hover:bg-white/90">
              {t('dashboard.participate')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/games?category=highEarning')}
          className={`relative min-w-0 min-h-[160px] text-left ${panelClass} group transition sm:min-h-[220px] lg:min-h-0 lg:h-full hover:border-gray-300 dark:hover:border-white/[0.1]`}
        >
          <ResponsiveCloudinaryImage
            src={secondaryBanner.src}
            alt={secondaryBanner.alt || ''}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
            sizes="(max-width: 1024px) 100vw, 30vw"
            widths={[360, 480, 640, 768, 960]}
            loading="lazy"
          />
          <div className="relative z-[1] flex h-full min-h-[160px] flex-col justify-between p-4 sm:min-h-[220px] md:p-5 lg:min-h-0">
            <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-white md:text-base">
              {t('dashboard.bestGameWeek')}
            </p>
            <span className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition group-hover:bg-white/90 md:text-sm">
              {t('dashboard.playNow')}
            </span>
          </div>
        </button>
      </div>

      <div className="flex gap-3">
        <form
          onSubmit={handleSearchSubmit}
          className={`flex min-w-0 flex-[7] items-center gap-3 px-4 py-3 ${controlPanelClass}`}
          role="search"
        >
          <HiOutlineMagnifyingGlass className="h-5 w-5 shrink-0 text-gray-400 dark:text-white/55" strokeWidth={1.75} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none dark:text-white/90 dark:placeholder:text-white/45"
            aria-label={t('dashboard.searchPlaceholder')}
            enterKeyHint="search"
          />
          {searchQuery.trim() ? (
            <button
              type="button"
              onClick={clearSearch}
              className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={t('common.clear')}
            >
              <HiOutlineXMark className="h-5 w-5" strokeWidth={1.75} />
            </button>
          ) : null}
        </form>

        <button
          type="button"
          onClick={() => navigate('/games?category=highEarning')}
          className={`flex min-w-0 flex-[3] items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 dark:text-white/90 dark:hover:bg-[#303030] dark:hover:text-white ${controlPanelClass}`}
        >
          <HiOutlineAdjustmentsHorizontal className="h-5 w-5 shrink-0 text-gray-500 dark:text-white/65" strokeWidth={1.75} />
          <span className="truncate">{t('dashboard.providers')}</span>
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-[980px] grid-cols-4 gap-2.5 xl:max-w-[1040px] xl:gap-3">
        {CATEGORIES.map((cat) => {
          const isHome = location.pathname === '/';
          const active = isHome
            ? cat.id === 'markets'
            : categoryPathActive(cat, location.pathname, location.search);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategory(cat)}
              className="group relative mx-auto block w-full max-w-[235px] min-w-0 overflow-hidden rounded-[18px] text-left transition hover:-translate-y-0.5"
              aria-current={active ? 'page' : undefined}
            >
              <OptimizedImage
                webp={cat.image.webp}
                png={cat.image.png}
                alt={t(cat.labelKey)}
                loading="lazy"
                className="block h-auto w-full rounded-[18px] object-contain"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
