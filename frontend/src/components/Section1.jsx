import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CasinoGamesCard from './CasinoGamesCard';
import SkillsGamesCard from './SkillsGamesCard';
import MarketCard, { MarketCardSkeleton } from './MarketCard';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

const Section1 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Convert 24-hour time to 12-hour format
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Status: result format OR automatic close when closing time is reached
  // ***-**-*** → Open (green) | 156-2*-*** → Running (green) | 987-45-456 or past closing time → Closed (red)
  const getMarketStatus = (market) => {
    if (isPastClosingTime(market)) {
      return { status: 'closed', timer: null };
    }
    const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
    const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));

    if (hasOpening && hasClosing) {
      return { status: 'closed', timer: null };
    }
    if (hasOpening && !hasClosing) {
      return { status: 'running', timer: null };
    }
    return { status: 'open', timer: null };
  };

  // Fetch markets from API – only show loading skeleton on initial load; refresh updates in place to avoid UI fluctuation
  const fetchMarkets = async () => {
    const showLoading = isInitialLoad.current;
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
      const data = await response.json();

      if (data.success) {
        const mainOnly = (data.data || []).filter((m) => m.marketType !== 'startline');
        const transformedMarkets = mainOnly.map((market) => {
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
            closingNumber: market.closingNumber
          };
        });
        setMarkets(transformedMarkets);
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


  return (
    <section className="w-full bg-black  min-[375px]:pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 sm:pb-10 min-[375px]:px-3 sm:px-4 md:pb-8 max-w-full overflow-x-hidden">
      {/* ═══ Desktop: Left: Starline + Casino Games | MARKETS (center) | Right: Skills Games + King Bazaar ═══ */}
      <div className="hidden md:flex items-center gap-4 mt-4 mb-5 w-full max-w-7xl mx-auto px-4">
        {/* ── Left side: Starline, Casino Games ── */}
        <button
          onClick={() => navigate('/startline-dashboard')}
          className="group relative overflow-hidden rounded-2xl bg-black border-2 border-amber-500 hover:border-amber-400 transition-all duration-300 active:scale-95 cursor-pointer shrink-0"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-black">
              <img
                src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771484988/Black_and_White_Vintage_Star_Company_Logo_u2f6mb.png"
                alt="Starline"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <h3 className="text-white text-base font-bold uppercase leading-tight tracking-wide">{t('markets.starline')}</h3>
              <p className="text-amber-400/90 text-xs font-semibold mt-1">{t('markets.tapToPlay')}</p>
            </div>
          </div>
        </button>

        <div className="w-44 min-h-[4.5rem] shrink-0 [&>button]:h-full [&>button]:min-h-[4.5rem]">
          <CasinoGamesCard />
        </div>

        {/* ── Left gold line ── */}
        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#d4af37]/10 via-[#d4af37]/50 to-[#d4af37]/70 min-w-[20px]" />

        {/* ── MARKETS center ── */}
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-2.5 h-2.5 text-[#d4af37]/50" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/></svg>
          <h2 className="text-white text-lg font-bold tracking-[0.15em] uppercase">{t('markets.markets')}</h2>
          <svg className="w-2.5 h-2.5 text-[#d4af37]/50" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/></svg>
        </div>

        {/* ── Right gold line ── */}
        <div className="flex-1 h-[1px] bg-gradient-to-l from-[#d4af37]/10 via-[#d4af37]/50 to-[#d4af37]/70 min-w-[20px]" />

        {/* ── Right side: Skills Games, King Bazaar ── */}
        <div className="w-44 min-h-[4.5rem] shrink-0 [&>button]:h-full [&>button]:min-h-[4.5rem]">
          <SkillsGamesCard />
        </div>

        <button
          onClick={() => navigate('/king-bazaar-market')}
          className="group relative overflow-hidden rounded-2xl bg-black border-2 border-amber-500 hover:border-amber-400 transition-all duration-300 active:scale-95 cursor-pointer shrink-0"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-black">
              <img
                src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771485291/Yellow_and_Black_Illustrative_Esports_The_Lion_King_Logo_1_s7gnuh.png"
                alt="King Bazaar"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <h3 className="text-white text-base font-bold uppercase leading-tight tracking-wide">{t('markets.kingBazaar')}</h3>
              <p className="text-amber-400/90 text-xs font-semibold mt-1">{t('markets.tapToPlay')}</p>
            </div>
          </div>
        </button>
      </div>

      {/* ═══ Mobile: MARKETS Header only ═══ */}
      <div className="flex md:hidden items-end justify-center mb-4 min-[375px]:mb-6 sm:mb-8 w-full max-w-7xl mx-auto">
        <div className="flex-1 h-[2px] bg-[#d4af37] shrink min-w-0" />
        <div className="relative shrink-0 w-[110px] min-[375px]:w-[140px] sm:w-[180px] h-[24px] min-[375px]:h-[28px] sm:h-[34px]">
          <svg className="w-full h-full" viewBox="0 0 240 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            {/* Add small bottom "wings" so lines join like screenshot */}
            <path d="M0 39 H26 L40 2 H200 L214 39 H240" stroke="#d4af37" strokeWidth="2" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pt-2 sm:pt-3">
            <h2 className="text-white text-sm min-[375px]:text-base sm:text-xl font-bold tracking-wider">{t('markets.markets').toUpperCase()}</h2>
          </div>
        </div>
        <div className="flex-1 h-[2px] bg-[#d4af37] shrink min-w-0" />
      </div>
      {/* Market Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <MarketCardSkeleton key={i} themeIndex={i} />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">{t('markets.noMarketsAvailable')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 max-w-7xl mx-auto">
          {markets.map((market, index) => (
            <MarketCard
              key={market.id}
              market={market}
              themeIndex={index}
              onPlay={(m) => navigate('/bidoptions', { state: { market: m } })}
              onScheduleTomorrow={(m) =>
                navigate('/bidoptions', { state: { market: m, scheduleForTomorrow: true } })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Section1;
