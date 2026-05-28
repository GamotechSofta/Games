import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { filterMarketsByQuery, toMarketNameKey } from '../utils/marketSearch';
import { MdLocalFireDepartment } from 'react-icons/md';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import useMainMarkets from '../hooks/useMainMarkets';
import MarketCard from './MarketCard';
import { MARKET_SECTION_THEME } from '../config/dashboardTheme';

const ALL_MARKETS_GRID_CLASS =
  'grid grid-cols-2 gap-2.5 pb-1 md:grid-cols-5 md:gap-3';

const MARKET_CARD_SKELETON_CLASS =
  'relative h-[168px] w-full min-w-0 overflow-hidden rounded-[24px] bg-[#180707] sm:h-[176px]';

function MarketRow({ title, icon: Icon, section, markets, titleKey, showAction = true, layout = 'grid' }) {
  const { t } = useTranslation();
  const theme = MARKET_SECTION_THEME[section] || MARKET_SECTION_THEME.popular;

  if (!markets.length) return null;

  return (
    <section className="mb-6 w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`h-5 w-5 shrink-0 ${theme.iconColor}`} />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t(titleKey)}</h2>
        </div>
        {showAction ? (
          <button type="button" className={`shrink-0 text-sm font-medium hover:underline ${theme.viewAll}`}>
            {t('dashboard.viewAll')}
          </button>
        ) : null}
      </div>

      {layout === 'grid' ? (
        <div className={ALL_MARKETS_GRID_CLASS}>
          {markets.map((market, i) => (
            <MarketCard key={market.id} market={market} index={i} section={section} />
          ))}
        </div>
      ) : (
        <div className="scrollbar-hidden flex w-full gap-3 overflow-x-auto pb-2">
          {markets.map((market, i) => (
            <div key={market.id} className="w-[170px] min-w-[170px] shrink-0 md:w-[180px] md:min-w-[180px] xl:w-[190px] xl:min-w-[190px]">
              <MarketCard market={market} index={i} section={section} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MarketSections({ searchQuery = '', viewMode = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, setTick] = React.useState(0);
  const { markets, loading, refetch } = useMainMarkets({ limit: 100 });

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

  const allMarkets = filteredMarkets;

  const gridSkeleton = (
    <div className={ALL_MARKETS_GRID_CLASS}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`${MARKET_CARD_SKELETON_CLASS} skeleton-shimmer`} />
      ))}
    </div>
  );

  if (loading && !markets.length) {
    return (
      <div id="market-sections">
        <div className="mb-3 h-5 w-48 rounded bg-gray-200 skeleton-shimmer dark:bg-[#1a1a1a]" />
        {gridSkeleton}
      </div>
    );
  }

  if (!markets.length) {
    return (
      <div
        id="market-sections"
        className="text-center py-12 bg-white dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-white/[0.08]"
      >
        <p className="text-gray-500 dark:text-[#b0b0b0]">{t('markets.noMarketsAvailable')}</p>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div id="market-sections">
        {filteredMarkets.length > 0 ? (
          <MarketRow
            titleKey="dashboard.searchResults"
            icon={MdLocalFireDepartment}
            section="popular"
            markets={filteredMarkets}
            showAction={false}
            layout="grid"
          />
        ) : (
          <div className="text-center py-12 bg-white dark:bg-[#161616] rounded-xl border border-gray-200 dark:border-white/[0.08]">
            <p className="text-gray-500 dark:text-[#b0b0b0] mb-4">
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
    <div id="market-sections">
      <MarketRow
        titleKey="dashboard.allMarkets"
        icon={MdLocalFireDepartment}
        section="popular"
        markets={allMarkets}
        showAction={false}
        layout="grid"
      />
    </div>
  );
}
