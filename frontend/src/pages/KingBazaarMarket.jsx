import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';

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

// King Bazaar: Format jodi result "65" to "6 5" for display
const formatKingBazaarJodi = (jodi) => {
  const s = (jodi || '').toString().trim();
  if (s.length === 2 && /^\d{2}$/.test(s)) {
    return s.split('').join(' '); // "65" -> "6 5"
  }
  if (s.includes('-')) {
    // Handle partial result like "*-5" or "6-*"
    return s.split('').join(' ').replace(/-/g, ' ');
  }
  return '* *'; // Default when no result
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

const DEMO_SLOTS = [
  '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00',
];

const KingBazaarMarket = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const marketKey = (location.state?.marketKey || location.state?.key || '').toString().trim().toLowerCase();
  const marketLabel = (location.state?.marketLabel || location.state?.label || 'King Bazaar').toString();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Show markets from API if available, otherwise show frontend-only demo slots.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=king`);
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : [];
        const keyNorm = (marketKey || '').toString().trim().toLowerCase();

        // Server already filters by marketType=king, only filter by group
        const filtered = list.filter((m) => {
          const group = (m?.kingBazaarGroup || '').toString().trim().toLowerCase();
          if (!keyNorm) return true;
          return group === keyNorm;
        });

        const mapped = filtered
          .map((m) => {
            const st = (m.startingTime || '').toString().trim().slice(0, 5);
            const status = isPastClosingTime(m)
              ? 'closed'
              : (m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'closed' : 'open');
            return {
              id: m._id,
              marketName: m.marketName || m.gameName || marketLabel,
              startingTime: st || null,
              closingTime: m.closingTime || m.startingTime || null,
              openingNumber: m.openingNumber || null,
              closingNumber: m.closingNumber || null,
              displayResult: m.displayResult || '***-**-***',
              status,
              _raw: m,
              _isDemo: false,
            };
          })
          .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));

        if (!cancelled) {
          if (mapped.length > 0) {
            setItems(mapped);
          } else {
            setItems(
              DEMO_SLOTS.map((t) => ({
                id: `king-demo-${t}`,
                marketName: marketLabel,
                startingTime: t,
                closingTime: t,
                openingNumber: null,
                closingNumber: null,
                displayResult: '***-**-***',
                status: 'open',
                _raw: null,
                _isDemo: true,
              })),
            );
          }
        }
      } catch {
        if (!cancelled) {
          setItems(
            DEMO_SLOTS.map((t) => ({
              id: `king-demo-${t}`,
              marketName: marketLabel,
              startingTime: t,
              closingTime: t,
              openingNumber: null,
              closingNumber: null,
              displayResult: '***-**-***',
              status: 'open',
              _raw: null,
              _isDemo: true,
            })),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [marketKey, marketLabel]);

  // Refresh every 5 seconds to show new results
  useEffect(() => {
    const interval = setInterval(() => {
      const run = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=king`);
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : [];
          const keyNorm = (marketKey || '').toString().trim().toLowerCase();
          const filtered = list.filter((m) => {
            const group = (m?.kingBazaarGroup || '').toString().trim().toLowerCase();
            if (!keyNorm) return true;
            return group === keyNorm;
          });
          const mapped = filtered.map((m) => {
            const st = (m.startingTime || '').toString().trim().slice(0, 5);
            const status = isPastClosingTime(m) ? 'closed' : (m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'closed' : 'open');
            return {
              id: m._id,
              marketName: m.marketName || m.gameName || marketLabel,
              startingTime: st || null,
              closingTime: m.closingTime || m.startingTime || null,
              openingNumber: m.openingNumber || null,
              closingNumber: m.closingNumber || null,
              displayResult: m.displayResult || '***-**-***',
              status,
              _raw: m,
              _isDemo: false,
            };
          }).sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));
          if (mapped.length > 0) setItems(mapped);
        } catch (err) {
          console.error('Error refreshing King Bazaar markets:', err);
        }
      };
      run();
    }, 5000);
    return () => clearInterval(interval);
  }, [marketKey, marketLabel]);

  const title = marketLabel || 'King Bazaar';

  return (
    <div className="min-h-screen bg-black text-white pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl md:max-w-6xl lg:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-3">
        <div className="flex items-center gap-3 md:gap-4 md:rounded-3xl md:border md:border-white/10 md:bg-[#111113] md:px-6 md:py-5 md:shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
          <button
            type="button"
            onClick={() => navigate('/king-bazaar-dashboard')}
            className="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white active:scale-95 transition shrink-0"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white/60 leading-none">King Bazaar Market</div>
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-wide truncate">{title}</div>
            <div className="hidden sm:block mt-1 text-xs text-white/50">
              Select a time slot to place bets. Green = open, red = closed for today.
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_14px_rgba(52,211,153,0.35)]" />
              Open
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400/90 shadow-[0_0_14px_rgba(251,113,133,0.28)]" />
              Closed
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[225px] md:h-[285px] rounded-2xl md:rounded-3xl bg-[#202124] border border-white/10 animate-pulse" />
            ))
          ) : (
            items.map((m, idx) => {
              const timeLabel = formatTime12(m.startingTime) || '-';
              const slotClosed = isSlotClosedTodayIST(m.startingTime, tick);
              const hasDeclaredOpen =
                m.openingNumber != null && /^\d{3}$/.test(String(m.openingNumber));
              const hasDeclaredClose =
                m.closingNumber != null && /^\d{3}$/.test(String(m.closingNumber));
              const isClosedForToday = slotClosed || (hasDeclaredOpen && hasDeclaredClose);
              const statusText = isClosedForToday ? 'Close For Today' : 'Open';
              // King Bazaar: Display jodi result (e.g., "65" as "6 5")
              const pill = formatKingBazaarJodi(m.displayResult || m._raw?.displayResult);
              const countdown = formatCountdown(msUntilNextIST(m.startingTime, tick));
              const imageUrl = KING_BAZAAR_MARKET_IMAGE_OVERRIDES[idx % KING_BAZAAR_MARKET_IMAGE_OVERRIDES.length] || KING_BAZAAR_MARKET_IMAGE_URL;

              const canOpen = !isClosedForToday;

              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!canOpen}
                  onClick={() => {
                    if (!canOpen) return;
                    const marketForBidOptions = m._raw
                      ? {
                          ...(m._raw || {}),
                          _id: m.id,
                          marketName: m.marketName,
                          gameName: m.marketName,
                          startingTime: m.startingTime,
                          closingTime: m.closingTime,
                          openingNumber: m.openingNumber,
                          closingNumber: m.closingNumber,
                          status: m.status === 'running' ? 'running' : 'open',
                        }
                      : {
                          _id: 'king-demo-market',
                          marketType: 'king',
                          marketName: m.marketName,
                          gameName: m.marketName,
                          startingTime: m.startingTime,
                          closingTime: m.closingTime,
                          openingNumber: null,
                          closingNumber: null,
                          status: 'open',
                        };
                    navigate('/bidoptions', {
                      state: {
                        marketType: 'king',
                        market: marketForBidOptions,
                      },
                    });
                  }}
                  className={`relative overflow-hidden rounded-3xl border shadow-[0_16px_34px_rgba(0,0,0,0.55)] transition md:hover:-translate-y-1 md:hover:shadow-[0_22px_60px_rgba(0,0,0,0.65)] ${
                    canOpen
                      ? 'border-white/10 hover:border-[#d4af37]/40 active:scale-[0.99] cursor-pointer'
                      : 'border-white/10 opacity-95 cursor-not-allowed'
                  }`}
                >
                  <div className="relative h-[150px] md:h-[190px] overflow-hidden bg-gradient-to-br from-[#0b0b0b] via-[#15171b] to-[#050505]">
                    <img
                      src={imageUrl}
                      alt="King Bazaar Market"
                      className={`absolute inset-0 w-full h-full object-contain p-0 ${
                        canOpen ? '' : 'opacity-70 md:grayscale'
                      }`}
                      loading="lazy"
                      draggable="false"
                    />
                  </div>

                  <div className="bg-[#202124] border-t border-white/10 px-3 py-2.5 md:px-4 md:py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] md:text-sm font-extrabold text-[#d4af37] truncate">
                        {countdown}
                      </div>
                      <div className="text-[13px] md:text-sm font-extrabold text-white/90 whitespace-nowrap">{timeLabel}</div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div
                        className={`font-extrabold text-[#d4af37] tracking-wide ${
                          String(pill).includes('*')
                            ? 'text-[22px] md:text-[28px] leading-none'
                            : 'text-[16px] md:text-[18px]'
                        }`}
                      >
                        {pill}
                      </div>
                      <svg className="w-4 h-4 text-white/55 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>

                    <div
                      className={`mt-1 text-center text-[12px] font-semibold ${
                        statusText === 'Close For Today'
                          ? 'text-red-400'
                          : statusText === 'Open'
                            ? 'text-emerald-400'
                            : 'text-white/80'
                      }`}
                    >
                      {statusText}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default KingBazaarMarket;

