import React, { memo, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useSpecialMarketSlots from '../hooks/useSpecialMarketSlots';
import useVisibleNowMs from '../hooks/useVisibleNowMs';
import { iconBtn } from '../styles/appTheme';

const STARLINE_MARKET_IMAGE_URL =
  'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770641576/Untitled_1080_x_1080_px_1_gyjbpl.svg';

const STARLINE_MARKET_FIRST_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_11_1_1_fqrqpr_xnt8al.png';

const STARLINE_MARKET_SECOND_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_10_2_1_x8ji72_ugka1w.png';

const STARLINE_MARKET_THIRD_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_3_1_qqgezq_lgd9wq.png';

const STARLINE_MARKET_FOURTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_4_1_wm47pu_qethnu.png';

const STARLINE_MARKET_FIFTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_7_1_b7mxik_dzpbre.png';

const STARLINE_MARKET_SIXTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_5_2_op4u73_o0eaqv.png';

const STARLINE_MARKET_SEVENTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_8_1_zdpype_cn1gwg.png';

// Reuse existing (already hosted) assets so every slot can have a unique image.
const STARLINE_MARKET_EIGHTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_9_1_oc8usl_hzconw.png';
const STARLINE_MARKET_NINTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_14_1_hmsbwv_twcatd.png';
const STARLINE_MARKET_TENTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_11_1_1_fqrqpr_xnt8al.png';
const STARLINE_MARKET_ELEVENTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_7_1_b7mxik_dzpbre.png';
const STARLINE_MARKET_TWELFTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_9_1_oc8usl_hzconw.png';
const STARLINE_MARKET_THIRTEENTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722976/Untitled_design_10_2_1_x8ji72_ugka1w.png';
const STARLINE_MARKET_FOURTEENTH_IMAGE_URL =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722977/Untitled_design_4_1_wm47pu_qethnu.png';

// Order matches `scheduleTimes`: 11:00, 12:00, ..., 23:00, 00:00
const STARLINE_MARKET_IMAGE_OVERRIDES = [
  STARLINE_MARKET_FIRST_IMAGE_URL,
  STARLINE_MARKET_SECOND_IMAGE_URL,
  STARLINE_MARKET_THIRD_IMAGE_URL,
  STARLINE_MARKET_FOURTH_IMAGE_URL,
  STARLINE_MARKET_FIFTH_IMAGE_URL,
  STARLINE_MARKET_SIXTH_IMAGE_URL,
  STARLINE_MARKET_SEVENTH_IMAGE_URL,
  STARLINE_MARKET_EIGHTH_IMAGE_URL,
  STARLINE_MARKET_NINTH_IMAGE_URL,
  STARLINE_MARKET_TENTH_IMAGE_URL,
  STARLINE_MARKET_ELEVENTH_IMAGE_URL,
  STARLINE_MARKET_TWELFTH_IMAGE_URL,
  STARLINE_MARKET_THIRTEENTH_IMAGE_URL,
  STARLINE_MARKET_FOURTEENTH_IMAGE_URL,
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

const sumDigits = (s) => [...String(s)].reduce((acc, c) => acc + (Number(c) || 0), 0);
const openDigit = (open3) => (open3 && /^\d{3}$/.test(String(open3)) ? String(sumDigits(open3) % 10) : '*');

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
  // Special-case 00:00: treat as end-of-day midnight (next day) for this schedule.
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

function isStarlineSlotClosedForToday(slot, nowMs) {
  const slotClosed = isSlotClosedTodayIST(slot.startingTime, nowMs);
  const hasDeclaredOpen = slot.openingNumber != null && /^\d{3}$/.test(String(slot.openingNumber));
  return slotClosed || hasDeclaredOpen;
}

function starlineSlotPropsAreEqual(prev, next) {
  if (prev.m.id !== next.m.id) return false;
  if (prev.m.startingTime !== next.m.startingTime) return false;
  if (prev.m.openingNumber !== next.m.openingNumber) return false;
  if (prev.m.closingNumber !== next.m.closingNumber) return false;
  if (prev.m.marketName !== next.m.marketName) return false;
  if (prev.marketKey !== next.marketKey) return false;
  if (prev.marketLabel !== next.marketLabel) return false;
  return (
    isStarlineSlotClosedForToday(prev.m, prev.nowMs)
    === isStarlineSlotClosedForToday(next.m, next.nowMs)
  );
}

const StarlineSlotCard = memo(function StarlineSlotCard({
  m,
  nowMs,
  marketKey,
  marketLabel,
  onShowClosedModal,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const timeLabel = formatTime12(m.startingTime) || '-';
  const isClosedForToday = isStarlineSlotClosedForToday(m, nowMs);
  const hasDeclaredOpen = m.openingNumber != null && /^\d{3}$/.test(String(m.openingNumber));
  const pill = `${hasDeclaredOpen ? String(m.openingNumber) : '***'} - ${openDigit(m.openingNumber)}`;
  const canOpen = !isClosedForToday;
  const marketStatus = isClosedForToday ? 'closed' : 'open';
  const isClickable = canOpen;

  const bidState = {
    marketType: 'starline',
    market: {
      _id: m.id,
      marketName: m.marketName,
      gameName: m.marketName,
      startingTime: m.startingTime,
      closingTime: m.closingTime,
      openingNumber: m.openingNumber,
      closingNumber: m.closingNumber,
      status: marketStatus,
    },
    starlineMarketKey: marketKey,
    starlineMarketLabel: marketLabel || 'Starline',
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg transform transition-all duration-200 flex items-center gap-2 min-[375px]:gap-3 sm:gap-4 p-2.5 min-[375px]:p-3 sm:p-4 border border-gray-200 dark:border-white/5 ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] hover:border-gray-200 dark:border-white/10' : 'cursor-default opacity-90'
      }`}
      onClick={() => isClickable && navigate('/bidoptions', { state: bidState })}
      role={isClickable ? 'button' : undefined}
    >
      <div className="flex flex-col shrink-0 min-w-0">
        <div className="text-gray-900 dark:text-white text-base min-[375px]:text-lg sm:text-xl md:text-2xl font-bold leading-tight truncate">
          {timeLabel}
        </div>
        {marketStatus === 'closed' && (
          <div className="text-red-600 dark:text-red-400 text-[10px] min-[375px]:text-xs sm:text-sm font-semibold mt-0.5 truncate">
            {t('starlineMarket.closeForToday')}
          </div>
        )}
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <div className="flex items-center justify-center rounded-full border bg-slate-100 border-slate-200 dark:bg-black dark:border-white/10 min-w-[6.5rem] min-[375px]:min-w-[7.25rem] sm:min-w-[8rem] md:min-w-[8.75rem] h-9 min-[375px]:h-10 sm:h-11 md:h-12 px-3 sm:px-4">
          <p className="text-sm min-[375px]:text-base sm:text-lg md:text-xl font-bold whitespace-nowrap text-red-600 dark:text-red-400 text-center tabular-nums">
            {pill}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (marketStatus === 'closed') {
            onShowClosedModal();
          } else {
            navigate('/bidoptions', { state: bidState });
          }
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
        <span className="text-[10px] min-[375px]:text-xs sm:text-sm font-semibold whitespace-nowrap">{t('starlineMarket.playGame')}</span>
      </button>
    </div>
  );
}, starlineSlotPropsAreEqual);

const StarlineMarket = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const marketKey = (location.state?.marketKey || location.state?.key || '').toString().trim().toLowerCase();
  const marketLabel = (location.state?.marketLabel || location.state?.label || 'Starline').toString();

  const { items, loading, refetch } = useSpecialMarketSlots({
    marketType: 'startline',
    groupKey: marketKey,
    marketLabel,
    enabled: Boolean(marketKey),
  });
  const nowMs = useVisibleNowMs();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const handleShowClosedModal = useCallback(() => setShowClosedModal(true), []);

  const title = marketLabel || 'Starline';
  const isKalyanStarline = title.toString().toLowerCase().includes('kalyan');

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl md:max-w-6xl lg:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-3">
        <div className="flex items-center gap-3 md:gap-4 md:rounded-3xl md:border md:border-gray-200 dark:md:border-white/10 md:bg-white md:px-6 md:py-5 md:shadow-md dark:md:bg-[#111113] dark:md:shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
          <button
            type="button"
            onClick={() => navigate('/startline-dashboard')}
            className={`w-11 h-11 flex items-center justify-center active:scale-95 transition shrink-0 ${iconBtn}`}
            aria-label={t('common.back')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-600 dark:text-white/60 leading-none">{t('starlineMarket.pageTitle')}</div>
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-wide truncate text-gray-900 dark:text-white">{title}</div>
            <div className="mt-1 text-xs text-gray-600 dark:text-white/50">{t('starlineMarket.selectTimeSlot')}</div>
          </div>

          {/* Desktop legend */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400/90 dark:shadow-[0_0_14px_rgba(52,211,153,0.35)]" />
              {t('starlineMarket.open')}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-rose-400/90 dark:shadow-[0_0_14px_rgba(251,113,133,0.28)]" />
              {t('starlineMarket.closed')}
            </div>
          </div>
        </div>

        {!loading && items.length === 0 && (
          <div className="mt-4 md:mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200">
            <p className="font-medium">{t('starlineMarket.noTimeSlots', { title })}</p>
            <p className="mt-1 text-amber-800 dark:text-amber-200/90">{t('starlineMarket.slotsAddedIn')}</p>
          </div>
        )}

        <div className="mt-4 md:mt-6 grid grid-cols-1 md:grid-cols-2 gap-2.5 min-[375px]:gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2.5 min-[375px]:p-3 sm:p-4 flex items-center gap-2 min-[375px]:gap-3 sm:gap-4 border border-gray-200 dark:border-white/5 skeleton-shimmer">
                <div className="w-14 min-[375px]:w-16 sm:w-20 h-10 min-[375px]:h-12 sm:h-14 rounded bg-gray-200 dark:bg-white/10" />
                <div className="flex-1 h-10 min-[375px]:h-12 sm:h-14 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="w-20 min-[375px]:w-24 sm:w-28 h-9 min-[375px]:h-10 sm:h-12 rounded-full bg-gray-200 dark:bg-white/10" />
              </div>
            ))
          ) : (
            items.map((m) => (
              <StarlineSlotCard
                key={m.id}
                m={m}
                nowMs={nowMs}
                marketKey={marketKey}
                marketLabel={marketLabel}
                onShowClosedModal={handleShowClosedModal}
              />
            ))
          )}
        </div>
      </div>

      {/* Closed Market Modal */}
      {showClosedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full relative border border-gray-200 dark:border-white/10">
            {/* Close button */}
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

            {/* Content */}
            <div className="px-6 py-8 text-center">
              {/* Red X icon in dark red circle */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/30">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              {/* Sorry title */}
              <h2 className="text-red-600 dark:text-red-400 text-xl font-bold mb-3">{t('starlineMarket.sorry')}</h2>

              {/* Message */}
              <div className="text-gray-700 dark:text-white/90 text-sm leading-relaxed mb-6">
                <p className="mb-2">{t('starlineMarket.bettingClosed')}</p>
                <p>{t('starlineMarket.comeNextDay')}</p>
              </div>

              {/* OK button */}
              <button
                type="button"
                onClick={() => setShowClosedModal(false)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {t('starlineMarket.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StarlineMarket;

