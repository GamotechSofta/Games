import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdLocalFireDepartment } from 'react-icons/md';
import { FaThLarge } from 'react-icons/fa';
import { filterMarketsByQuery, toMarketNameKey } from '../../utils/marketSearch';
import { useRefreshOnMarketReset } from '../../hooks/useRefreshOnMarketReset';
import useMainMarkets from '../../hooks/useMainMarkets';
import MarketCard from '../MarketCard';
import { MARKET_SECTION_THEME } from '../../config/dashboardTheme';

function MarketRow({
  titleKey,
  fallbackTitle,
  icon: Icon,
  section,
  markets,
  scrollable = true,
  showAction = true,
  gapClass = 'gap-3',
  onAction,
}) {
  const { t } = useTranslation();
  const theme = MARKET_SECTION_THEME[section] || MARKET_SECTION_THEME.popular;
  const rowClass = scrollable
    ? `scrollbar-hidden flex w-full ${gapClass} overflow-x-auto pb-2`
    : 'grid w-full grid-cols-2 gap-3 pb-2 sm:grid-cols-3 md:grid-cols-5 md:gap-4';
  const itemClass = scrollable
    ? 'w-[170px] min-w-[170px] shrink-0 md:w-[180px] md:min-w-[180px] xl:w-[190px] xl:min-w-[190px]'
    : 'min-w-0';

  if (!markets.length) return null;

  return (
    <section className="mb-6 w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${theme.iconColor}`} />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {t(titleKey, { defaultValue: fallbackTitle })}
          </h2>
        </div>
        {showAction ? (
          <button
            type="button"
            onClick={onAction}
            className={`shrink-0 text-sm font-medium hover:underline ${theme.viewAll}`}
          >
            {t('dashboard.viewAll', { defaultValue: 'View All' })}
          </button>
        ) : null}
      </div>

      <div className={rowClass}>
        {markets.map((market, i) => (
          <div key={market.id} className={itemClass}>
            <MarketCard market={market} index={i} section={section} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketRowSkeleton({ scrollable = true, gapClass = 'gap-3' }) {
  const rowClass = scrollable
    ? `scrollbar-hidden flex w-full ${gapClass} overflow-x-auto pb-2`
    : 'grid w-full grid-cols-2 gap-3 pb-2 sm:grid-cols-3 md:grid-cols-5 md:gap-4';
  const itemClass = scrollable
    ? 'h-[176px] w-[170px] min-w-[170px] shrink-0 rounded-[24px] bg-gray-100 skeleton-shimmer dark:bg-[#161616] md:w-[180px] md:min-w-[180px] xl:w-[190px] xl:min-w-[190px]'
    : 'h-[176px] min-w-0 rounded-[24px] bg-gray-100 skeleton-shimmer dark:bg-[#161616]';

  return (
    <div>
      <div className="mb-3 h-5 w-40 rounded bg-gray-200 skeleton-shimmer dark:bg-[#1a1a1a]" />
      <div className={rowClass}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={itemClass} />
        ))}
      </div>
    </div>
  );
}

export default function DesktopHomeSections({ searchQuery = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const { markets, loading, refetch } = useMainMarkets();

  const getMarketDisplayName = useCallback(
    (gameName) => t(`markets.names.${toMarketNameKey(gameName)}`, { defaultValue: gameName }),
    [t],
  );

  const filteredMarkets = useMemo(
    () => filterMarketsByQuery(markets, searchQuery, getMarketDisplayName),
    [markets, searchQuery, getMarketDisplayName],
  );

  const isSearching = Boolean(searchQuery.trim());

  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useRefreshOnMarketReset(refetch);

  const popularMarkets = filteredMarkets.filter((market) => market.showInPopular).slice(0, 12);
  const allMarkets = filteredMarkets;

  if (isSearching) {
    return (
      <div id="market-sections" className="mx-auto w-full max-w-[1440px] px-4 lg:px-6 xl:px-8">
        {filteredMarkets.length > 0 ? (
          <MarketRow
            titleKey="dashboard.searchResults"
            fallbackTitle="Search Results"
            icon={MdLocalFireDepartment}
            section="popular"
            markets={filteredMarkets}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-white/[0.08] dark:bg-[#161616]">
            <p className="mb-4 text-gray-500 dark:text-[#b0b0b0]">
              {t('dashboard.noSearchResults', { query: searchQuery.trim() })}
            </p>
            <button
              type="button"
              onClick={() => navigate(`/games?q=${encodeURIComponent(searchQuery.trim())}`)}
              className="text-sm font-semibold text-[#D32F2F] hover:underline dark:text-[#e60000]"
            >
              {t('dashboard.searchGamesHint')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="market-sections" className="mx-auto w-full max-w-[1440px] space-y-1 px-4 lg:px-6 xl:px-8">
      {loading ? (
        <MarketRowSkeleton />
      ) : (
        <MarketRow
          titleKey="dashboard.popularMarkets"
          fallbackTitle="Popular Markets"
          icon={MdLocalFireDepartment}
          section="popular"
          markets={popularMarkets}
          onAction={() => navigate('/markets?view=all')}
        />
      )}

      {loading ? (
        <MarketRowSkeleton scrollable={false} gapClass="gap-4" />
      ) : (
        <MarketRow
          titleKey="dashboard.allMarkets"
          fallbackTitle="All Markets"
          icon={FaThLarge}
          section="popular"
          markets={allMarkets}
          scrollable={false}
          showAction={false}
          gapClass="gap-4"
        />
      )}
    </div>
  );
}
