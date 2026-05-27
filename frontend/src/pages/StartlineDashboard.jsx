import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { iconBtn, textPrimary } from '../styles/appTheme';

const STARLINE_DASHBOARD_MARKET_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_16_1_palesh_qef2qd.png';

const getMarketStatus = (market) => {
  if (isPastClosingTime(market)) return 'closed';
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  const isStartline = market.marketType === 'startline';
  if (isStartline && hasOpening) return 'closed';
  if (hasOpening && hasClosing) return 'closed';
  if (hasOpening && !hasClosing) return 'running';
  return 'open';
};

const StartlineDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [markets, setMarkets] = useState([]);
  const [starlineGroups, setStarlineGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const balanceText = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const b = Number(u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0) || 0;
      return b.toLocaleString('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
    } catch {
      return '0';
    }
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=startline`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        // Server already filters by marketType=startline
        const mapped = data.data
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

  const fetchStarlineGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch(`${API_BASE_URL}/markets/starline-groups`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        setStarlineGroups(data.data);
      } else {
        setStarlineGroups([]);
      }
    } catch {
      setStarlineGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    fetchStarlineGroups();
  }, []);

  useRefreshOnMarketReset(fetchMarkets);

  const openStarlineMarket = (key, label) => {
    navigate('/starline-market', {
      state: {
        marketKey: key,
        marketLabel: label || 'Starline',
      },
    });
  };

  return (
    <div className="min-h-screen w-full text-gray-900 dark:text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-5 md:px-8">
        {/* Header row (as per screenshot, in our theme) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`w-11 h-11 shrink-0 ${iconBtn}`}
              aria-label={t('common.back')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`text-base min-[360px]:text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-wide truncate ${textPrimary}`}>
              {t('startlineDashboard.title')}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/bank')}
            className="shrink-0 px-2 py-1.5 flex items-center gap-2"
            aria-label={t('startlineDashboard.wallet')}
            title={t('startlineDashboard.wallet')}
          >
            <img
              src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
              alt={t('startlineDashboard.wallet')}
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
            />
            <span className={`font-bold ${textPrimary}`}>{balanceText}</span>
          </button>
        </div>

        <div className="hidden md:block mt-4 text-sm text-gray-500 dark:text-white/60">
          {t('startlineDashboard.chooseMarket')}
        </div>

        <div className="mt-4 md:mt-6 h-px bg-gray-200 dark:bg-white/10" />

        {/* Dynamic Starline markets from API (same as admin tabs) */}
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
          {loadingGroups ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[95px] md:h-[120px] rounded-2xl bg-gray-100 dark:bg-[#202124] border border-gray-200 dark:border-white/10 skeleton-shimmer" />
            ))
          ) : starlineGroups.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-white/60 text-sm">
              {t('startlineDashboard.noMarkets')}
            </div>
          ) : (
            starlineGroups.map((m, idx) => (
              <div key={m.key} className="text-center">
                <button
                  type="button"
                  onClick={() => openStarlineMarket(m.key, m.label)}
                  className="group w-full min-h-[120px] min-[420px]:min-h-[130px] md:min-h-[150px] rounded-2xl md:rounded-3xl bg-white/60 dark:bg-transparent border border-gray-100 dark:border-transparent px-1.5 py-2 md:px-2.5 md:py-3 flex flex-col items-center active:scale-[0.98] md:hover:-translate-y-1 md:hover:shadow-md dark:md:hover:shadow-none transition-all"
                  aria-label={m.label}
                >
                  <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-gradient-to-br from-[#f2c14e] to-[#d4af37] border border-black/20 overflow-hidden shadow-[0_8px_18px_rgba(242,193,78,0.22)] group-hover:shadow-[0_10px_28px_rgba(242,193,78,0.28)] transition-shadow">
                    <img
                      src={STARLINE_DASHBOARD_MARKET_IMAGE_URL}
                      alt={m.label || t('bidOptions.starlineMarket')}
                      className="absolute inset-0 w-full h-full object-contain p-0 scale-125"
                      loading="lazy"
                      draggable="false"
                    />
                  </div>
                  <div
                    className="mt-1.5 w-full text-[11px] min-[360px]:text-[12px] min-[420px]:text-[13px] sm:text-sm md:text-[15px] lg:text-base font-semibold text-amber-800 dark:text-[#d4af37] leading-snug px-1 overflow-hidden"
                    title={m.label}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {m.label}
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

export default StartlineDashboard;

