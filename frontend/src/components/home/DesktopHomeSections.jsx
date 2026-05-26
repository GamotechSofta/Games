import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdLocalFireDepartment } from 'react-icons/md';
import { FaThLarge } from 'react-icons/fa';
import { filterMarketsByQuery, toMarketNameKey } from '../../utils/marketSearch';
import { API_BASE_URL } from '../../config/api';
import { isPastClosingTime } from '../../utils/marketTiming';
import { useRefreshOnMarketReset } from '../../hooks/useRefreshOnMarketReset';
import MarketCard from '../MarketCard';
import { MARKET_SECTION_THEME } from '../../config/dashboardTheme';
import PopularCasinoSection from './PopularCasinoSection';
import HomeGamesPanel from './HomeGamesPanel';

const formatTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getMarketStatus = (market) => {
  if (isPastClosingTime(market)) return { status: 'closed', timer: null };
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  if (hasOpening && hasClosing) return { status: 'closed', timer: null };
  if (hasOpening && !hasClosing) return { status: 'running', timer: null };
  return { status: 'open', timer: null };
};

function MarketRow({ titleKey, fallbackTitle, icon: Icon, section, markets, scrollable = true, showAction = true, gapClass = 'gap-3' }) {
  const { t } = useTranslation();
  const theme = MARKET_SECTION_THEME[section] || MARKET_SECTION_THEME.popular;
  const imageShape = scrollable ? 'round' : 'square';
  const rowClass = scrollable
    ? `scrollbar-hidden flex w-full ${gapClass} overflow-x-auto pb-2`
    : 'grid w-full grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4 pb-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]';
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
          <button type="button" className={`shrink-0 text-sm font-medium hover:underline ${theme.viewAll}`}>
            {t('dashboard.viewAll', { defaultValue: 'View All' })}
          </button>
        ) : null}
      </div>

      <div className={rowClass}>
        {markets.map((market, i) => (
          <div key={market.id} className={itemClass}>
            <MarketCard market={market} index={i} section={section} imageShape={imageShape} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketRowSkeleton({ scrollable = true, gapClass = 'gap-3' }) {
  const rowClass = scrollable
    ? `scrollbar-hidden flex w-full ${gapClass} overflow-x-auto pb-2`
    : 'grid w-full grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4 pb-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]';
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
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const [, setTick] = useState(0);

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

  const fetchMarkets = async () => {
    const showLoading = isInitialLoad.current;
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
      const data = await response.json();
      if (data.success) {
        const mainOnly = (data.data || []).filter((market) => market.marketType !== 'startline');
        const transformed = mainOnly.map((market) => {
          const status = getMarketStatus(market);
          return {
            id: market._id,
            gameName: market.marketName,
            showInPopular: Boolean(market.showInPopular),
            timeRange: `${formatTime(market.startingTime)} - ${formatTime(market.closingTime)}`,
            result: market.displayResult || '***-**-***',
            status: status.status,
            timer: status.timer,
            winNumber: market.winNumber,
            startingTime: market.startingTime,
            closingTime: market.closingTime,
            betClosureTime: market.betClosureTime ?? 0,
            openingNumber: market.openingNumber,
            closingNumber: market.closingNumber,
          };
        });
        setMarkets(transformed);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      if (showLoading) {
        isInitialLoad.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMarkets();
    const dataInterval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(dataInterval);
  }, []);

  useRefreshOnMarketReset(fetchMarkets);

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
      <PopularCasinoSection onSelect={(path) => navigate(path)} />

      {loading ? (
        <MarketRowSkeleton />
      ) : (
        <MarketRow
          titleKey="dashboard.popularMarkets"
          fallbackTitle="Popular Markets"
          icon={MdLocalFireDepartment}
          section="popular"
          markets={popularMarkets}
        />
      )}

      <HomeGamesPanel category="all" titleOverride={t('games.allCasinoGames', { defaultValue: 'All Casino Games' })} />

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
