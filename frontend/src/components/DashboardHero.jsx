import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { categoryPathActive } from '../utils/dashboardNav';
import { useTranslation } from 'react-i18next';
import { HiOutlineMagnifyingGlass, HiOutlineAdjustmentsHorizontal, HiOutlineChevronRight, HiOutlineXMark } from 'react-icons/hi2';
import { HOME_BANNERS } from '../config/banners';

const CATEGORIES = [
  { id: 'markets', labelKey: 'dashboard.catMarkets', path: '/markets' },
  { id: 'starline', labelKey: 'dashboard.catStarline', path: '/startline-dashboard' },
  { id: 'casino', labelKey: 'dashboard.catCasino', path: '/games?category=highEarning' },
  { id: 'skills', labelKey: 'dashboard.catSkillGames', path: '/games?category=skills' },
  { id: 'kingBazaar', labelKey: 'dashboard.catKingBazaar', path: '/king-bazaar-market' },
];

const panelClass =
  'rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-white/[0.06] dark:bg-[#1a1a1a]';

const controlPanelClass =
  'min-h-[44px] rounded-[18px] border border-gray-200 bg-white shadow-sm dark:border-white/[0.04] dark:bg-[#282828] dark:shadow-none';

const categoryControlClass =
  'shrink-0 min-h-[44px] rounded-[18px] border px-5 py-2.5 text-sm font-medium transition-all duration-200';

export default function DashboardHero({ searchQuery = '', onSearchChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const categoriesRef = useRef(null);

  const primaryBanner = HOME_BANNERS[0];
  const secondaryBanner = HOME_BANNERS[1] || HOME_BANNERS[0];

  const handleCategory = (cat) => {
    if (cat.path) navigate(cat.path);
  };

  const scrollCategories = () => {
    categoriesRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
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
      <div className="flex min-h-[220px] gap-3">
        <button
          type="button"
          onClick={() => navigate('/funds?tab=add-fund')}
          className={`relative min-w-0 flex-[7] text-left ${panelClass} group transition hover:border-gray-300 dark:hover:border-white/[0.1]`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90 transition group-hover:opacity-100"
            style={{ backgroundImage: `url(${primaryBanner.src})` }}
          />
          <div className="relative z-[1] flex h-full min-h-[220px] flex-col justify-end p-6 md:p-8">
            <span className="inline-flex w-fit items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition group-hover:bg-white/90">
              {t('dashboard.participate')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/games?category=highEarning')}
          className={`relative min-w-0 flex-[3] text-left ${panelClass} group transition hover:border-gray-300 dark:hover:border-white/[0.1]`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90"
            style={{ backgroundImage: `url(${secondaryBanner.src})` }}
          />
          <div className="relative z-[1] flex h-full min-h-[220px] flex-col justify-between p-4 md:p-5">
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

      <div className="relative">
        <div ref={categoriesRef} className="flex gap-2 overflow-x-auto scrollbar-hidden pr-10">
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
                className={[
                  categoryControlClass,
                  active
                    ? 'border-[#D32F2F] bg-[#D32F2F] text-white shadow-[0_0_12px_rgba(211,47,47,0.35)] dark:border-[#e60000] dark:bg-[#e60000] dark:text-white dark:shadow-[0_0_20px_rgba(230,0,0,0.35)]'
                    : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.04] dark:bg-[#282828] dark:text-white dark:shadow-none dark:hover:bg-[#303030] dark:hover:text-white',
                ].join(' ')}
              >
                {t(cat.labelKey)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={scrollCategories}
          className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:text-gray-900 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-white/60 dark:hover:text-white"
          aria-label={t('common.next')}
        >
          <HiOutlineChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
