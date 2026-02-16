import React, { createContext, useContext, useMemo, useState } from 'react';
import { isBettingAllowed, getTodayIST, isPastClosingTime } from '../../utils/marketTiming';

const BettingWindowContext = createContext({ allowed: true, message: null });

/** Selected date (YYYY-MM-DD) from the form; when set and in the future (IST), betting window is allowed for scheduled bets */
export const SchedulingContext = createContext({ selectedDateIST: null, setSelectedDateIST: () => {} });

export function SchedulingProvider({ children }) {
    const [selectedDateIST, setSelectedDateIST] = useState(null);
    const value = useMemo(() => ({ selectedDateIST, setSelectedDateIST }), [selectedDateIST]);
    return (
        <SchedulingContext.Provider value={value}>
            {children}
        </SchedulingContext.Provider>
    );
}

export function useScheduling() {
    return useContext(SchedulingContext);
}

export function BettingWindowProvider({ market, children, scheduleForTomorrow }) {
    const { selectedDateIST } = useScheduling();
    const value = useMemo(() => {
        const todayIST = getTodayIST();
        const isFutureDate = selectedDateIST && String(selectedDateIST).trim() !== '' && selectedDateIST > todayIST;
        // Scheduling for tomorrow/future: skip today's closure check so user can place scheduled bets
        if (scheduleForTomorrow || isFutureDate) return { allowed: true, message: null };
        // Market already closed today (IST): allow so user can still submit scheduled bet (e.g. state lost on refresh)
        if (market && isPastClosingTime(market)) return { allowed: true, message: null };
        if (!market?.startingTime || !market?.closingTime) return { allowed: true, message: null };
        const result = isBettingAllowed(market);
        return { allowed: result.allowed, message: result.message || null };
    }, [scheduleForTomorrow, selectedDateIST, market]);

    return (
        <BettingWindowContext.Provider value={value}>
            {children}
        </BettingWindowContext.Provider>
    );
}

export function useBettingWindow() {
    return useContext(BettingWindowContext);
}
