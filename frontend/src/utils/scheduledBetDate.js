import { formatDateDisplay, getTodayIST, getTomorrowIST } from './marketTiming';

/** Default date picker value (YYYY-MM-DD, IST). */
export function getInitialBetDateIso(scheduleForTomorrow = false) {
  if (scheduleForTomorrow) return getTomorrowIST();
  return getTodayIST();
}

/** API scheduledDate when placing bet (null = today's run, not scheduled). */
export function resolveScheduledDateForPlaceBet(scheduleForTomorrow) {
  if (scheduleForTomorrow) return getTomorrowIST();
  return null;
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
