import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useMarketGroups from '../hooks/useMarketGroups';
import useSpecialMarketSlots from '../hooks/useSpecialMarketSlots';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { iconBtn, textPrimary } from '../styles/appTheme';

// Reuse the same hosted assets for consistent UI.
const KING_BAZAAR_MARKET_IMAGE_URL =
  'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770641576/Untitled_1080_x_1080_px_1_gyjbpl.svg';

const KING_BAZAAR_MARKET_FIRST_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_11_1_1_fqrqpr_xnt8al.png';
const KING_BAZAAR_MARKET_SECOND_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_10_2_1_x8ji72_ugka1w.png';
const KING_BAZAAR_MARKET_THIRD_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_3_1_qqgezq_lgd9wq.png';
const KING_BAZAAR_MARKET_FOURTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_4_1_wm47pu_qethnu.png';
const KING_BAZAAR_MARKET_FIFTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_7_1_b7mxik_dzpbre.png';
const KING_BAZAAR_MARKET_SIXTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_5_2_op4u73_o0eaqv.png';
const KING_BAZAAR_MARKET_SEVENTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_8_1_zdpype_cn1gwg.png';
const KING_BAZAAR_MARKET_EIGHTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_9_1_oc8usl_hzconw.png';
const KING_BAZAAR_MARKET_NINTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_14_1_hmsbwv_twcatd.png';

const KING_BAZAAR_MARKET_IMAGE_OVERRIDES = [
  KING_BAZAAR_MARKET_FIRST_IMAGE_URL,
  KING_BAZAAR_MARKET_SECOND_IMAGE_URL,
  KING_BAZAAR_MARKET_THIRD_IMAGE_URL,
  KING_BAZAAR_MARKET_FOURTH_IMAGE_URL,
  KING_BAZAAR_MARKET_FIFTH_IMAGE_URL,
  KING_BAZAAR_MARKET_SIXTH_IMAGE_URL,
  KING_BAZAAR_MARKET_SEVENTH_IMAGE_URL,
  KING_BAZAAR_MARKET_EIGHTH_IMAGE_URL,
  KING_BAZAAR_MARKET_NINTH_IMAGE_URL,
];

const formatTime12 = (time24) => {
  if (!time24) return '';
  const [hhRaw, mmRaw] = String(time24).split(':');
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh)) return String(time24);
  const ampm = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 || 12;
  const min = Number.isFinite(mm) ? String(mm).padStart(2, '0') : '00';
  return `${h12}:${min} ${ampm}`;
};

// King Bazaar: Format jodi result "65" to "6 5"; placeholders → "* *"
const formatKingBazaarJodi = (jodi) => {
  const s = (jodi || '').toString().trim();
  if (!s || s === '**' || s === '*-*' || s === '***-**-***' || /^[\*\-\s]+$/.test(s)) {
    return '* *';
  }
  if (s.length === 2 && /^\d{2}$/.test(s)) {
    return s.split('').join(' ');
  }
  const partial = s.match(/^(\d|\*)\s*[-–]\s*(\d|\*)$/);
  if (partial) {
    return `${partial[1]} ${partial[2]}`;
  }
  return '* *';
};

const getTodayIST = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const addDaysIST = (yyyyMmDd, days) => {
  const base = new Date(`${yyyyMmDd}T12:00:00+05:30`);
  base.setDate(base.getDate() + days);
  return getTodayIST(base);
};

const getTodayTargetMsIST = (timeHHMM, nowMs) => {
  const todayIST = getTodayIST(new Date(nowMs));
  const t = (timeHHMM || '').toString().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const dateStr = t === '00:00' ? addDaysIST(todayIST, 1) : todayIST;
  const targetToday = new Date(`${dateStr}T${t}:00+05:30`).getTime();
  if (Number.isNaN(targetToday)) return null;
  return targetToday;
};

const msUntilNextIST = (timeHHMM, nowMs) => {
  const targetToday = getTodayTargetMsIST(timeHHMM, nowMs);
  if (targetToday == null) return null;
  const todayIST = getTodayIST(new Date(nowMs));
  const t = (timeHHMM || '').toString().slice(0, 5);
  const target = targetToday > nowMs ? targetToday : new Date(`${addDaysIST(todayIST, 1)}T${t}:00+05:30`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, target - nowMs);
};

const isSlotClosedTodayIST = (timeHHMM, nowMs) => {
  const targetToday = getTodayTargetMsIST(timeHHMM, nowMs);
  if (targetToday == null) return true;
  return nowMs >= targetToday;
};

const formatCountdown = (ms) => {
  if (ms == null) return '';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

const KING_BAZAAR_PICKER_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771486141/Yellow_and_Black_Illustrative_Esports_The_Lion_King_Logo_1_chmwuq.png';

const KingBazaarMarket = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const marketKey = (location.state?.marketKey || location.state?.key || '').toString().trim().toLowerCase();
  const marketLabel = (location.state?.marketLabel || location.state?.label || 'King Bazaar').toString();
  const pickingGroup = !marketKey;

  const { groups: kingGroups, loading: groupsLoading, refetch: refetchGroups } = useMarketGroups('king', {
    enabled: pickingGroup,
  });
  const { items, loading: slotsLoading, refetch: refetchSlots } = useSpecialMarketSlots({
    marketType: 'king',
    groupKey: marketKey,
    marketLabel,
    enabled: Boolean(marketKey),
  });

  const loading = pickingGroup ? groupsLoading : slotsLoading;
  const [tick, setTick] = useState(() => Date.now());
  const [showClosedModal, setShowClosedModal] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pickingGroup || kingGroups.length !== 1) return;
    const g = kingGroups[0];
    navigate('/king-bazaar-market', {
      replace: true,
      state: { marketKey: g.key, marketLabel: g.label || 'King Bazaar' },
    });
  }, [pickingGroup, kingGroups, navigate]);

  useRefreshOnMarketReset(() => {
    if (pickingGroup) refetchGroups();
    else refetchSlots();
  });

  const openKingGroup = (key, label) => {
    navigate('/king-bazaar-market', {
      state: { marketKey: key, marketLabel: label || 'King Bazaar' },
    });
  };

  const title = marketLabel || 'King Bazaar';

  return (
    <div className="w-full text-gray-900 dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-5 md:px-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => {
              if (marketKey) {
                navigate('/king-bazaar-market', { replace: true, state: {} });
              } else {
                navigate('/');
              }
            }}
            className={`w-11 h-11 flex items-center justify-center active:scale-95 transition shrink-0 ${iconBtn}`}
            aria-label={t('common.back')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-600 dark:text-white/60 leading-none">{t('kingBazaarMarket.pageTitle')}</div>
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-wide truncate text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 text-xs text-gray-600 dark:text-white/50">
              {t('kingBazaarMarket.selectTimeSlot')}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400/90 dark:shadow-[0_0_14px_rgba(52,211,153,0.35)]" />
              {t('kingBazaarMarket.open')}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-rose-400/90 dark:shadow-[0_0_14px_rgba(251,113,133,0.28)]" />
              {t('kingBazaarMarket.closed')}
            </div>
          </div>
        </div>

        {pickingGroup ? (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[120px] rounded-2xl bg-gray-100 dark:bg-[#202124] border border-gray-200 dark:border-white/10 skeleton-shimmer" />
              ))
            ) : kingGroups.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-white/60 text-sm">
                {t('startlineDashboard.noMarkets')}
              </div>
            ) : (
              kingGroups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => openKingGroup(g.key, g.label)}
                  className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111113] p-3 flex flex-col items-center gap-2 active:scale-[0.98] transition-all"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-black flex items-center justify-center">
                    <img src={KING_BAZAAR_PICKER_IMAGE_URL} alt="" className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <span className={`text-sm font-semibold text-center ${textPrimary}`}>{g.label}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
        {!loading && items.length === 0 && (
          <div className="mt-4 md:mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200">
            <p className="font-medium">{t('kingBazaarMarket.noTimeSlots', { title })}</p>
            <p className="mt-1 text-amber-800 dark:text-amber-200/90">{t('kingBazaarMarket.slotsAddedIn')}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2.5 min-[375px]:gap-3 sm:gap-4 md:mt-6 md:grid-cols-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm dark:border-white/5 dark:bg-gray-800 flex items-center gap-2 min-[375px]:gap-3 min-[375px]:p-3 sm:gap-4 sm:p-4 skeleton-shimmer">
                <div className="w-14 min-[375px]:w-16 sm:w-20 h-10 min-[375px]:h-12 sm:h-14 rounded bg-gray-200 dark:bg-white/10" />
                <div className="flex-1 h-10 min-[375px]:h-12 sm:h-14 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="w-20 min-[375px]:w-24 sm:w-28 h-9 min-[375px]:h-10 sm:h-12 rounded-full bg-gray-200 dark:bg-white/10" />
              </div>
            ))
          ) : (
            items.map((m) => {
              const timeLabel = formatTime12(m.startingTime) || '-';
              const slotClosed = isSlotClosedTodayIST(m.startingTime, tick);
              const hasDeclaredOpen = m.openingNumber != null && /^\d{3}$/.test(String(m.openingNumber));
              const hasDeclaredClose = m.closingNumber != null && /^\d{3}$/.test(String(m.closingNumber));
              const isClosedForToday = slotClosed || (hasDeclaredOpen && hasDeclaredClose);
              const canOpen = !isClosedForToday;
              const marketStatus = isClosedForToday ? 'closed' : 'open';
              const isClickable = canOpen;
              const pill = formatKingBazaarJodi(m.displayResult || m._raw?.displayResult);

              const handleNavigate = () => {
                if (!canOpen) return;
                const marketForBidOptions = m._raw
                  ? { ...(m._raw || {}), _id: m.id, marketName: m.marketName, gameName: m.marketName, startingTime: m.startingTime, closingTime: m.closingTime, openingNumber: m.openingNumber, closingNumber: m.closingNumber, status: m.status === 'running' ? 'running' : 'open' }
                  : { _id: 'king-demo-market', marketType: 'king', marketName: m.marketName, gameName: m.marketName, startingTime: m.startingTime, closingTime: m.closingTime, openingNumber: null, closingNumber: null, status: 'open' };
                navigate('/bidoptions', { state: { marketType: 'king', market: marketForBidOptions, kingBazaarMarketKey: marketKey, kingBazaarMarketLabel: marketLabel || 'King Bazaar' } });
              };

              return (
                <div
                  key={m.id}
                  className={`rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition-all duration-200 flex items-center gap-2 min-[375px]:gap-3 min-[375px]:p-3 sm:gap-4 sm:p-4 dark:border-white/5 dark:bg-gray-800 ${
                    isClickable ? 'cursor-pointer hover:scale-[1.02] hover:border-gray-200 dark:border-white/10' : 'cursor-default opacity-90'
                  }`}
                  onClick={() => isClickable && handleNavigate()}
                  role={isClickable ? 'button' : undefined}
                >
                  <div className="flex flex-col shrink-0 min-w-0">
                    <div className="text-gray-900 dark:text-white text-base min-[375px]:text-lg sm:text-xl md:text-2xl font-bold leading-tight truncate">{timeLabel}</div>
                    {marketStatus === 'closed' && (
                      <div className="text-red-600 dark:text-red-400 text-[10px] min-[375px]:text-xs sm:text-sm font-semibold mt-0.5 truncate">{t('kingBazaarMarket.closeForToday')}</div>
                    )}
                  </div>
                  <div className="flex-1 flex justify-center min-w-0">
                    <div className="flex items-center justify-center rounded-full border bg-slate-100 border-slate-200 dark:bg-black dark:border-white/10 min-w-[4.25rem] min-[375px]:min-w-[4.75rem] sm:min-w-[5.25rem] md:min-w-[5.75rem] h-9 min-[375px]:h-10 sm:h-11 md:h-12 px-3 sm:px-4">
                      <p className="text-sm min-[375px]:text-base sm:text-lg md:text-xl font-bold whitespace-nowrap text-red-600 dark:text-red-400 text-center tabular-nums">
                        {pill}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (marketStatus === 'closed') setShowClosedModal(true);
                      else handleNavigate();
                    }}
                    className={`shrink-0 border rounded-full px-2 min-[375px]:px-2.5 sm:px-3 md:px-4 py-1.5 min-[375px]:py-2 sm:py-2.5 flex items-center gap-1 min-[375px]:gap-1.5 sm:gap-2 transition-colors ${
                      isClickable
                        ? 'bg-gradient-to-r from-emerald-600 to-green-500 border-emerald-600 text-white hover:from-emerald-500 hover:to-green-400 dark:border-emerald-500'
                        : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700/50 dark:border-white/10 dark:text-gray-200'
                    }`}
                  >
                    <svg className="w-2.5 h-2.5 min-[375px]:w-3 min-[375px]:h-3 sm:w-4 sm:h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="text-[10px] min-[375px]:text-xs sm:text-sm font-semibold whitespace-nowrap">{t('kingBazaarMarket.playGame')}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
          </>
        )}
      </div>

      {/* Closed Market Modal */}
      {showClosedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full relative border border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setShowClosedModal(false)}
              className="absolute top-4 right-4 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="px-6 py-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/30">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-red-600 dark:text-red-400 text-xl font-bold mb-3">{t('kingBazaarMarket.sorry')}</h2>
              <div className="text-gray-700 dark:text-white/90 text-sm leading-relaxed mb-6">
                <p className="mb-2">{t('kingBazaarMarket.bettingClosed')}</p>
                <p>{t('kingBazaarMarket.comeNextDay')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowClosedModal(false)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {t('kingBazaarMarket.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KingBazaarMarket;

