import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTomorrowIST, isBettingAllowed } from '../utils/marketTiming';
import {
  getBetDisplayDate,
  getInitialBetDateIso,
  getReviewDateText,
  resolveScheduledDateForPlaceBet,
} from '../utils/scheduledBetDate';

/**
 * Bet date for main markets — honours scheduleForTomorrow from bid navigation state.
 */
function shouldScheduleForTomorrow(location) {
  if (location.state?.scheduleForTomorrow === true) return true;
  const market = location.state?.market;
  if (!market) return false;
  const type = (market.marketType || '').toString().toLowerCase();
  if (type === 'startline' || type === 'king') return false;
  if (market.status === 'closed') return true;
  const timing = isBettingAllowed(market);
  return timing.allowed === false;
}

export function useScheduledBetDate() {
  const location = useLocation();
  const scheduleForTomorrow = shouldScheduleForTomorrow(location);

  const [selectedDate, setSelectedDateState] = useState(() => getInitialBetDateIso(scheduleForTomorrow));

  useEffect(() => {
    if (!scheduleForTomorrow) return;
    const tomorrow = getTomorrowIST();
    setSelectedDateState(tomorrow);
    try {
      localStorage.setItem('betSelectedDate', tomorrow);
    } catch {
      // ignore
    }
  }, [scheduleForTomorrow]);

  const setSelectedDate = useCallback((nextDate) => {
    setSelectedDateState(nextDate);
    try {
      localStorage.setItem('betSelectedDate', nextDate);
    } catch {
      // ignore
    }
  }, []);

  const scheduledDateForApi = useMemo(
    () => resolveScheduledDateForPlaceBet(scheduleForTomorrow, selectedDate),
    [scheduleForTomorrow, selectedDate],
  );

  const reviewDateText = useMemo(
    () => getReviewDateText(scheduleForTomorrow, selectedDate),
    [scheduleForTomorrow, selectedDate],
  );

  const displayDate = useMemo(
    () => getBetDisplayDate(scheduleForTomorrow, selectedDate),
    [scheduleForTomorrow, selectedDate],
  );

  return {
    scheduleForTomorrow,
    selectedDate,
    setSelectedDate,
    scheduledDateForApi,
    reviewDateText,
    displayDate,
  };
}

export default useScheduledBetDate;
