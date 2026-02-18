import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

const Section1 = () => {
  const navigate = useNavigate();
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
      {/* ═══ Desktop: Starline + MARKETS + King Bazaar — single row ═══ */}
      <div className="hidden md:flex items-center gap-4 mt-4 mb-5 w-full max-w-7xl mx-auto px-4">
        {/* ── STARLINE Button ── */}
        <button
          onClick={() => navigate('/startline-dashboard')}
          className="group relative overflow-hidden rounded-xl bg-[#111113] border border-[#f2c14e]/25 hover:border-[#f2c14e]/60 transition-all duration-300 active:scale-[0.97] cursor-pointer shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#f2c14e]/[0.06] to-transparent group-hover:from-[#f2c14e]/[0.12] transition-all duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
          <div className="relative flex items-center gap-3 px-4 py-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f2c14e] to-[#b8860b] flex items-center justify-center shrink-0 shadow-[0_2px_14px_rgba(212,175,55,0.4)] group-hover:shadow-[0_2px_20px_rgba(212,175,55,0.6)] group-hover:scale-105 transition-all duration-300">
              <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-[#f2c14e] text-base font-black tracking-wider leading-none">STARLINE</h3>
              <p className="text-[#f2c14e] text-[11px] mt-1 font-semibold animate-pulse group-hover:animate-none group-hover:text-[#f2c14e] transition-colors drop-shadow-[0_0_8px_rgba(242,193,78,0.6)]">Tap to Play</p>
            </div>
            <svg className="w-4 h-4 ml-1 text-[#f2c14e]/30 group-hover:text-[#f2c14e] group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f2c14e]/30 to-transparent group-hover:via-[#f2c14e]/60 transition-all" />
        </button>

        {/* ── Left gold line ── */}
        <div className="flex-1 h-[1px] bg-gradient-to-r from-[#d4af37]/10 via-[#d4af37]/50 to-[#d4af37]/70 min-w-[20px]" />

        {/* ── MARKETS center ── */}
        <div className="flex items-center gap-2 shrink-0">
          <svg className="w-2.5 h-2.5 text-[#d4af37]/50" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/></svg>
          <h2 className="text-white text-lg font-bold tracking-[0.15em] uppercase">Markets</h2>
          <svg className="w-2.5 h-2.5 text-[#d4af37]/50" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z"/></svg>
        </div>

        {/* ── Right gold line ── */}
        <div className="flex-1 h-[1px] bg-gradient-to-l from-[#d4af37]/10 via-[#d4af37]/50 to-[#d4af37]/70 min-w-[20px]" />

        {/* ── KING BAZAAR Button ── */}
        <button
          onClick={() => navigate('/king-bazaar-dashboard')}
          className="group relative overflow-hidden rounded-xl bg-[#111113] border border-[#f2c14e]/25 hover:border-[#f2c14e]/60 transition-all duration-300 active:scale-[0.97] cursor-pointer shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-l from-[#f2c14e]/[0.06] to-transparent group-hover:from-[#f2c14e]/[0.12] transition-all duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
          <div className="relative flex items-center gap-3 px-4 py-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f2c14e] to-[#b8860b] flex items-center justify-center shrink-0 shadow-[0_2px_14px_rgba(212,175,55,0.4)] group-hover:shadow-[0_2px_20px_rgba(212,175,55,0.6)] group-hover:scale-105 transition-all duration-300">
              <span className="text-xl leading-none">🎲</span>
            </div>
            <div className="text-left">
              <h3 className="text-[#f2c14e] text-base font-black tracking-wider leading-none">KING BAZAAR</h3>
              <p className="text-[#f2c14e] text-[11px] mt-1 font-semibold animate-pulse group-hover:animate-none group-hover:text-[#f2c14e] transition-colors drop-shadow-[0_0_8px_rgba(242,193,78,0.6)]">Tap to Play</p>
            </div>
            <svg className="w-4 h-4 ml-1 text-[#f2c14e]/30 group-hover:text-[#f2c14e] group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#f2c14e]/30 to-transparent group-hover:via-[#f2c14e]/60 transition-all" />
        </button>
      </div>

      {/* ═══ Mobile: MARKETS Header only ═══ */}
      <div className="flex md:hidden items-end justify-center mb-4 min-[375px]:mb-6 sm:mb-8 w-full max-w-7xl mx-auto gap-1 min-[375px]:gap-2 sm:gap-4">
        <div className="flex-1 h-[2px] bg-[#d4af37] shrink min-w-0" />
        <div className="relative shrink-0 w-[110px] min-[375px]:w-[140px] sm:w-[180px] h-[24px] min-[375px]:h-[28px] sm:h-[34px]">
          <svg className="w-full h-full" viewBox="0 0 240 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            {/* Add small bottom "wings" so lines join like screenshot */}
            <path d="M0 39 H26 L40 2 H200 L214 39 H240" stroke="#d4af37" strokeWidth="2" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pt-2 sm:pt-3">
            <h2 className="text-white text-sm min-[375px]:text-base sm:text-xl font-bold tracking-wider">MARKETS</h2>
          </div>
        </div>
        <div className="flex-1 h-[2px] bg-[#d4af37] shrink min-w-0" />
      </div>
      {/* Market Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-[375px]:gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg overflow-hidden border border-white/5 skeleton-shimmer">
              <div className="bg-white/10 py-2 px-3" />
              <div className="p-2 min-[375px]:p-3 sm:p-4 space-y-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-white/10 shrink-0" />
                  <div className="h-3 flex-1 max-w-[80%] rounded bg-white/10" />
                </div>
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-6 min-[375px]:h-7 sm:h-8 w-24 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No markets available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-[375px]:gap-3 sm:gap-4">
          {markets.map((market) => {
            // open + running = clickable for live bet; closed = not clickable for live, but has "Schedule for tomorrow"
            const isClickable = market.status === 'open' || market.status === 'running';
            return (
            <div
              key={market.id}
              className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg transform transition-all duration-200 ${
                isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default opacity-90'
              }`}
            >
              {/* Status: ***-**-***=Open(green), 156-2*-***=Running(green), 987-45-456=Closed(red) */}
              <div className={`${
                market.status === 'closed' ? 'bg-red-600' : 'bg-green-600'
              } py-1.5 min-[375px]:py-2 px-2 min-[375px]:px-3 text-center min-h-[32px] flex items-center justify-center`}>
                <p className="text-white text-[10px] min-[375px]:text-xs sm:text-sm font-semibold leading-tight">
                  {market.status === 'open' && 'MARKET IS OPEN'}
                  {market.status === 'running' && 'CLOSING IS RUNNING'}
                  {market.status === 'closed' && 'MARKET CLOSED'}
                </p>
              </div>

            {/* Card Content */}
            <div
              className="flex flex-col p-3 min-[375px]:p-3.5 sm:p-4 border-t border-white/5"
              onClick={() => isClickable && navigate('/bidoptions', { state: { market } })}
              role={isClickable ? 'button' : undefined}
            >
              {/* Time row */}
              <div className="flex items-center gap-1.5 mb-1.5 min-[375px]:mb-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-amber-500/90 text-[10px] min-[375px]:text-xs sm:text-sm font-medium truncate">{market.timeRange}</span>
              </div>

              {/* Game Name */}
              <h3 className="text-white text-sm min-[375px]:text-base sm:text-lg font-bold font-serif leading-tight truncate mb-2 min-[375px]:mb-2.5">
                {market.gameName}
              </h3>

              {/* Result */}
              <div className="mb-2 min-[375px]:mb-2.5">
                <p className="text-amber-400 text-base min-[375px]:text-lg sm:text-xl md:text-2xl font-extrabold tracking-wider leading-tight">
                  {market.result}
                </p>
              </div>

              {/* Action text */}
              {market.status === 'closed' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/bidoptions', { state: { market, scheduleForTomorrow: true } });
                  }}
                  className="mt-auto pt-1.5 border-t border-white/5 text-amber-400 text-[10px] min-[375px]:text-[11px] sm:text-sm font-semibold text-center hover:text-amber-300 w-full"
                >
                  Running for tomorrow
                </button>
              ) : (
                <p className="mt-auto pt-1.5 border-t border-white/5 text-amber-400 text-[10px] min-[375px]:text-[11px] sm:text-sm font-semibold text-center">
                  Tap to Play
                </p>
              )}
            </div>
          </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Section1;
