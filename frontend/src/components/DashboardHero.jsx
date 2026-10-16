import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { categoryPathActive } from '../utils/dashboardNav';
import { prefetchSpecialMarketChunks, prefetchSpecialMarketGroups } from '../api/prefetchSpecialMarkets';
import { useTranslation } from 'react-i18next';
import { HiOutlineMagnifyingGlass, HiOutlineAdjustmentsHorizontal, HiOutlineXMark } from 'react-icons/hi2';
import { HOME_BANNERS } from '../config/banners';
import ResponsiveCloudinaryImage from './ResponsiveCloudinaryImage';
import HomeCategoryCard, { HOME_CATEGORY_ICONS, HOME_CATEGORY_THEMES } from './home/HomeCategoryCard';

const CATEGORIES = [
  { id: 'games', labelKey: 'sidebar.games', path: '/games' },
  { id: 'markets', labelKey: 'dashboard.catMarkets', path: '/markets' },
  { id: 'starline', labelKey: 'dashboard.catStarline', path: '/startline-dashboard' },
  { id: 'kingBazaar', labelKey: 'dashboard.catKingBazaar', path: '/king-bazaar-market' },
];

const panelClass =
  'rounded-2xl border border-gray-200 bg-[#0a0a0a] overflow-hidden dark:border-white/[0.06] dark:bg-[#1a1a1a]';

const controlPanelClass =
  'min-h-[44px] rounded-[18px] border border-gray-200 bg-white shadow-sm dark:border-white/[0.04] dark:bg-[#282828] dark:shadow-none';

export default function DashboardHero({ searchQuery = '', onSearchChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    if (HOME_BANNERS.length <= 1) return undefined;

    let timerId = null;
    const advance = () => setBannerIndex((current) => (current + 1) % HOME_BANNERS.length);
    const start = () => {
      if (timerId) window.clearInterval(timerId);
      timerId = window.setInterval(advance, 5000);
    };
    const stop = () => {
      if (timerId) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate('/games')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/games');
          }
        }}
        className={`relative w-full cursor-pointer ${panelClass} group transition hover:border-gray-300 dark:hover:border-white/[0.1]`}
      >
        <div
          className="relative w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
        >
          {HOME_BANNERS.map((banner, idx) => (
            <div
              key={banner.src}
              className={
                idx === bannerIndex
                  ? 'relative w-full'
                  : 'pointer-events-none absolute top-0 left-0 w-full'
              }
              style={{ transform: `translateX(${idx * 100}%)` }}
            >
              <ResponsiveCloudinaryImage
                src={banner.src}
                alt={banner.alt || ''}
                className="block h-auto w-full object-contain"
                sizes="100vw"
                widths={[480, 640, 768, 960, 1200, 1440, 1920]}
                loading={idx === 0 ? 'eager' : 'lazy'}
                fetchPriority={idx === 0 ? 'high' : 'low'}
              />
            </div>
          ))}
        </div>

        {HOME_BANNERS.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-2">
            {HOME_BANNERS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBannerIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === bannerIndex ? 'w-6 bg-amber-500' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        )}
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
          onClick={() => navigate('/games')}
          className={`flex min-w-0 flex-[3] items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 dark:text-white/90 dark:hover:bg-[#303030] dark:hover:text-white ${controlPanelClass}`}
        >
          <HiOutlineAdjustmentsHorizontal className="h-5 w-5 shrink-0 text-gray-500 dark:text-white/65" strokeWidth={1.75} />
          <span className="truncate">{t('dashboard.providers')}</span>
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-[980px] grid-cols-4 gap-2.5 xl:max-w-[1040px] xl:gap-3">
        {CATEGORIES.map((cat) => {
          const active = categoryPathActive(cat, location.pathname, location.search);

          return (
            <HomeCategoryCard
              key={cat.id}
              label={t(cat.labelKey)}
              Icon={HOME_CATEGORY_ICONS[cat.id]}
              theme={HOME_CATEGORY_THEMES[cat.id]}
              onClick={() => handleCategory(cat)}
              active={active}
            />
          );
        })}
      </div>
    </section>
  );
}
