import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../config/api';

const STARLINE_DASHBOARD_MARKET_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_16_1_palesh_qef2qd.png';

export default function HomeStarlinePanel() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [starlineGroups, setStarlineGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingGroups(true);
        const res = await fetch(`${API_BASE_URL}/markets/starline-groups`);
        const data = await res.json();
        if (!cancelled) {
          setStarlineGroups(data?.success && Array.isArray(data?.data) ? data.data : []);
        }
      } catch {
        if (!cancelled) setStarlineGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStarlineMarket = (key, label) => {
    navigate('/starline-market', {
      state: {
        marketKey: key,
        marketLabel: label || 'Starline',
      },
    });
  };

  return (
    <section className="mt-2">
      <h2 className="mb-4 text-lg font-bold text-white">{t('startlineDashboard.title')}</h2>
      <p className="mb-4 text-sm text-white/60">{t('startlineDashboard.chooseMarket')}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-3 md:gap-4 lg:gap-5">
        {loadingGroups ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] rounded-2xl border border-white/10 bg-[#202124] skeleton-shimmer md:h-[150px]"
            />
          ))
        ) : starlineGroups.length === 0 ? (
          <div className="col-span-full py-8 text-center text-sm text-white/60">
            {t('startlineDashboard.noMarkets')}
          </div>
        ) : (
          starlineGroups.map((m) => (
            <div key={m.key} className="text-center">
              <button
                type="button"
                onClick={() => openStarlineMarket(m.key, m.label)}
                className="group flex w-full min-h-[120px] flex-col items-center rounded-2xl px-1.5 py-2 transition-all active:scale-[0.98] md:min-h-[150px] md:rounded-3xl md:px-2.5 md:py-3 md:hover:-translate-y-1"
                aria-label={m.label}
              >
                <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-black/20 bg-gradient-to-br from-[#f2c14e] to-[#d4af37] shadow-[0_8px_18px_rgba(242,193,78,0.22)] sm:h-24 sm:w-24 md:h-28 md:w-28 md:rounded-3xl group-hover:shadow-[0_10px_28px_rgba(242,193,78,0.28)]">
                  <img
                    src={STARLINE_DASHBOARD_MARKET_IMAGE_URL}
                    alt={m.label || t('bidOptions.starlineMarket')}
                    className="absolute inset-0 h-full w-full scale-125 object-contain p-0"
                    loading="lazy"
                    draggable="false"
                  />
                </div>
                <div
                  className="mt-1.5 w-full overflow-hidden px-1 text-[11px] font-semibold leading-snug text-[#d4af37] min-[360px]:text-[12px] min-[420px]:text-[13px] sm:text-sm md:text-[15px] lg:text-base"
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
    </section>
  );
}
