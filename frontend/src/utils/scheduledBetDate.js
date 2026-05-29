import { formatDateDisplay, getTodayIST, getTomorrowIST } from './marketTiming';

/** Default date picker value (YYYY-MM-DD, IST). */
export function getInitialBetDateIso(scheduleForTomorrow = false) {
  if (scheduleForTomorrow) return getTomorrowIST();
  try {
    const saved = localStorage.getItem('betSelectedDate');
    const today = getTodayIST();
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved > today) return saved;
  } catch {
    // ignore
  }
  return getTodayIST();
}

/** API scheduledDate when placing bet (null = today / immediate window). */
export function resolveScheduledDateForPlaceBet(scheduleForTomorrow, selectedDate) {
  const today = getTodayIST();
  if (scheduleForTomorrow) return getTomorrowIST();
  const iso = String(selectedDate || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso > today ? iso : null;
}

/** dd/mm/yyyy for review modal title. */
export function getReviewDateText(scheduleForTomorrow, selectedDate) {
  const iso = scheduleForTomorrow ? getTomorrowIST() : (selectedDate || getTodayIST());
  const d = new Date(`${iso}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
}

/** dd-mm-yyyy for read-only date field in bid UI. */
export function getBetDisplayDate(scheduleForTomorrow, selectedDate) {
  const iso = scheduleForTomorrow ? getTomorrowIST() : (selectedDate || getTodayIST());
  return formatDateDisplay(iso) || '';
}
