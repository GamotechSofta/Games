import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

const KING_BAZAAR_DASHBOARD_MARKET_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_16_1_palesh_qef2qd.png';

const getMarketStatus = (market) => {
  if (isPastClosingTime(market)) return 'closed';
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  if (hasOpening && hasClosing) return 'closed';
  if (hasOpening && !hasClosing) return 'running';
  return 'open';
};

const KingBazaarDashboard = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [kingBazaarGroups, setKingBazaarGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const balanceText = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const b = Number(u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0) || 0;
      return `${b}`;
    } catch {
      return '0';
    }
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/markets/get-markets`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        const onlyKing = data.data.filter((m) => m.marketType === 'king');
        const mapped = onlyKing
          .map((m) => {
            const status = getMarketStatus(m);
            return {
              id: m._id,
              marketName: m.marketName,
              startingTime: m.startingTime,
              closingTime: m.closingTime,
              openingNumber: m.openingNumber || null,
              closingNumber: m.closingNumber || null,
              displayResult: m.displayResult || null,
              status,
            };
          })
          .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));
        setMarkets(mapped);
      } else {
        setMarkets([]);
      }
    } catch {
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchKingBazaarGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch(`${API_BASE_URL}/markets/king-bazaar-groups`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        setKingBazaarGroups(data.data);
      } else {
        setKingBazaarGroups([]);
      }
    } catch {
      setKingBazaarGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    fetchKingBazaarGroups();
  }, []);

  useRefreshOnMarketReset(fetchMarkets);

  const openKingBazaarMarket = (key, label) => {
    navigate('/king-bazaar-market', {
      state: {
        marketKey: key,
        marketLabel: label || 'King Bazaar',
      },
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-3">
        {/* Header row (copied style from Starline dashboard) */}
        <div className="flex items-center justify-between gap-3 md:rounded-3xl md:border md:border-white/10 md:bg-[#111113] md:px-6 md:py-5 md:shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white active:scale-95 transition shrink-0"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-base min-[360px]:text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-wide truncate">
              KING BAZAAR DASHBOARD
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/bank')}
            className="shrink-0 rounded-full bg-[#202124] border border-white/10 px-4 py-2 flex items-center gap-2 shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
            aria-label="Wallet"
            title="Wallet"
          >
            <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h9a2 2 0 002-2v-2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12h6v4h-6z" />
            </svg>
            <span className="font-bold text-white/90">{balanceText}</span>
          </button>
        </div>

        <div className="hidden md:block mt-4 text-sm text-white/60">
          Choose a market to view hourly slots and play.
        </div>

        <div className="mt-4 md:mt-6 h-px bg-white/10 md:bg-white/5" />

        {/* King Bazaar markets */}
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
          {loadingGroups ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[95px] md:h-[120px] rounded-2xl bg-transparent animate-pulse" />
            ))
          ) : kingBazaarGroups.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-white/60">No King Bazaar markets available</p>
            </div>
          ) : (
            kingBazaarGroups.map((g) => (
              <div key={g.key} className="text-center">
                <button
                  type="button"
                  onClick={() => openKingBazaarMarket(g.key, g.label)}
                  className="group w-full min-h-[120px] min-[420px]:min-h-[130px] md:min-h-[150px] rounded-2xl md:rounded-3xl bg-transparent px-1.5 py-2 md:px-2.5 md:py-3 flex flex-col items-center transition-all active:scale-[0.98] md:hover:-translate-y-1"
                  aria-label={g.label}
                  title={g.label}
                >
                  <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#f2c14e] to-[#d4af37] border border-black/20 overflow-hidden shadow-[0_8px_18px_rgba(242,193,78,0.22)] group-hover:shadow-[0_10px_28px_rgba(242,193,78,0.28)] transition-shadow">
                    <img
                      src={KING_BAZAAR_DASHBOARD_MARKET_IMAGE_URL}
                      alt={g.label}
                      className="absolute inset-0 w-full h-full object-contain p-0 scale-125"
                      loading="lazy"
                      draggable="false"
                    />
                  </div>
                  <div
                    className="mt-1.5 w-full text-[11px] min-[360px]:text-[12px] min-[420px]:text-[13px] sm:text-sm md:text-[15px] lg:text-base font-semibold text-[#d4af37] leading-snug px-1 overflow-hidden"
                    title={g.label}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {g.label}
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KingBazaarDashboard;

