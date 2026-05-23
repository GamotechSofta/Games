import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { filterMarketsByQuery, toMarketNameKey } from '../utils/marketSearch';
import { MdLocalFireDepartment, MdOutlineLiveTv, MdOutlineNightlight } from 'react-icons/md';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import MarketCard from './MarketCard';
import { MARKET_SECTION_THEME } from '../config/dashboardTheme';

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

const isNightMarket = (name, closingTime) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('night')) return true;
  if (closingTime) {
    const hour = parseInt(closingTime.split(':')[0], 10);
    return hour >= 18 || hour < 6;
  }
  return false;
};

function MarketRow({ title, icon: Icon, section, markets, titleKey }) {
  const { t } = useTranslation();
  const theme = MARKET_SECTION_THEME[section] || MARKET_SECTION_THEME.popular;

  if (!markets.length) return null;

  return (
    <section className="mb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${theme.iconColor}`} />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t(titleKey)}</h2>
        </div>
        <button type="button" className={`text-sm font-medium hover:underline shrink-0 ${theme.viewAll}`}>
          {t('dashboard.viewAll')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
        {markets.map((market, i) => (
          <div key={market.id} className="min-w-0">
            <MarketCard market={market} index={i} section={section} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MarketSections({ searchQuery = '' }) {
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
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const fetchMarkets = async () => {
    const showLoading = isInitialLoad.current;
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
      const data = await response.json();
      if (data.success) {
        const mainOnly = (data.data || []).filter((m) => m.marketType !== 'startline');
        const transformed = mainOnly.map((market) => {
          const st = getMarketStatus(market);
          return {
            id: market._id,
            gameName: market.marketName,
            timeRange: `${formatTime(market.startingTime)} - ${formatTime(market.closingTime)}`,
            result: market.displayResult || '***-**-***',
            status: st.status,
            timer: st.timer,
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

  const popularMarkets = filteredMarkets.slice(0, 5);
  const liveMarkets = filteredMarkets
    .filter((m) => m.status === 'open' || m.status === 'running')
    .slice(0, 5);
  const nightMarkets = filteredMarkets
    .filter((m) => isNightMarket(m.gameName, m.closingTime))
    .slice(0, 5);

  if (loading) {
    return (
      <div id="market-sections" className="space-y-6">
        {[1, 2, 3].map((s) => (
          <div key={s}>
            <div className="h-5 w-40 bg-gray-200 dark:bg-[#1a1a1a] rounded skeleton-shimmer mb-3" />
            <div className="flex gap-3 w-full">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 min-w-0 h-[160px] bg-gray-100 dark:bg-[#161616] rounded-xl skeleton-shimmer" />
              ))}
            </div>
          </div>
        ))}
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
        titleKey="dashboard.popularMarkets"
        icon={MdLocalFireDepartment}
        section="popular"
        markets={popularMarkets.length ? popularMarkets : filteredMarkets.slice(0, 5)}
      />
      <MarketRow
        titleKey="dashboard.liveMarkets"
        icon={MdOutlineLiveTv}
        section="live"
        markets={liveMarkets.length ? liveMarkets : filteredMarkets.slice(0, 5)}
      />
      <MarketRow
        titleKey="dashboard.nightMarkets"
        icon={MdOutlineNightlight}
        section="night"
        markets={nightMarkets.length ? nightMarkets : filteredMarkets.slice(-5)}
      />
    </div>
  );
}
