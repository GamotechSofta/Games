import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimesCircle } from 'react-icons/fa';
import { isBettingAllowed, getTodayIST, isPastClosingTime } from '../../utils/marketTiming';

const BettingWindowContext = createContext({ allowed: true, closeOnly: false, message: null });

const SchedulingContext = createContext({ scheduleForTomorrow: false });

export function SchedulingProvider({ scheduleForTomorrow = false, children }) {
  const value = useMemo(() => ({ scheduleForTomorrow: !!scheduleForTomorrow }), [scheduleForTomorrow]);
  return (
    <SchedulingContext.Provider value={value}>
      {children}
    </SchedulingContext.Provider>
  );
}

export function useScheduling() {
  return useContext(SchedulingContext);
}

function computeWindowState(market, scheduleForTomorrow, selectedDateIST) {
  const todayIST = getTodayIST();
  const isFutureDate = selectedDateIST && String(selectedDateIST).trim() !== '' && selectedDateIST > todayIST;

  if (scheduleForTomorrow || isFutureDate) {
    return { allowed: true, closeOnly: false, message: null };
  }
  if (market && isPastClosingTime(market)) {
    return { allowed: true, closeOnly: false, message: null };
  }
  if (!market?.closingTime) {
    return { allowed: true, closeOnly: false, message: null };
  }
  const result = isBettingAllowed(market);
  return {
    allowed: result.allowed,
    closeOnly: result.closeOnly === true,
    message: result.message || null,
  };
}

function MarketClosedModal({ market, allowed, scheduleForTomorrow }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const prevAllowedRef = useRef(null);
  const hasShownRef = useRef(false);
  const marketIdRef = useRef(null);

  useEffect(() => {
    const mid = market?._id || market?.id || null;
    if (mid !== marketIdRef.current) {
      marketIdRef.current = mid;
      hasShownRef.current = false;
      prevAllowedRef.current = null;
      setVisible(false);
    }
  }, [market?._id, market?.id]);

  useEffect(() => {
    if (scheduleForTomorrow) return;
    if (prevAllowedRef.current === true && allowed === false && !hasShownRef.current) {
      hasShownRef.current = true;
      setVisible(true);
    }
    prevAllowedRef.current = allowed;
  }, [allowed, scheduleForTomorrow]);

  const goHome = () => {
    setVisible(false);
    navigate('/', { replace: true });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="market-closed-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-[#202124] shadow-2xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={goHome}
          className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <span className="text-2xl font-light leading-none">×</span>
        </button>
        <div className="pt-10 pb-6 px-6 text-center">
          <div className="flex justify-center mb-4">
            <FaTimesCircle className="w-20 h-20 text-red-500" aria-hidden />
          </div>
          <h2 id="market-closed-title" className="text-xl font-bold text-white mb-2">
            Market is closed
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Betting for this market has ended. You will be taken to the home page.
          </p>
          <button
            type="button"
            onClick={goHome}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] font-semibold text-base hover:from-[#e5c04a] hover:to-[#d4af37] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function BettingWindowProvider({ market, children, scheduleForTomorrow = false, selectedDateIST = null }) {
  const [windowState, setWindowState] = useState(() =>
    computeWindowState(market, scheduleForTomorrow, selectedDateIST)
  );

  useEffect(() => {
    const tick = () => setWindowState(computeWindowState(market, scheduleForTomorrow, selectedDateIST));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [market?._id, market?.id, market?.startingTime, market?.closingTime, market?.betClosureTime, market?.openDays, scheduleForTomorrow, selectedDateIST]);

  const value = useMemo(
    () => ({
      allowed: windowState.allowed,
      closeOnly: windowState.closeOnly,
      message: windowState.message,
    }),
    [windowState.allowed, windowState.closeOnly, windowState.message]
  );

  return (
    <BettingWindowContext.Provider value={value}>
      <MarketClosedModal market={market} allowed={windowState.allowed} scheduleForTomorrow={scheduleForTomorrow} />
      {children}
    </BettingWindowContext.Provider>
  );
}

export function useBettingWindow() {
  return useContext(BettingWindowContext);
}
