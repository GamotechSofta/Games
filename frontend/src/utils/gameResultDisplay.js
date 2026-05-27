/**
 * Parse market displayResult (e.g. "156-45-456", "156-2*-***", "***-**-***")
 * into labeled segments and a user-friendly status.
 */
export function parseDisplayResult(displayResult) {
  const raw = (displayResult || '***-**-***').toString().trim();
  const parts = raw.split('-');
  const open = (parts[0] || '***').trim();
  const jodi = (parts[1] || '**').trim();
  const close = (parts[2] || '***').trim();

  const isBlank = (seg) => !seg || /^[\*]+$/.test(seg);
  const openDeclared = !isBlank(open);
  const closeDeclared = !isBlank(close);
  const jodiFull = /^\d{2}$/.test(jodi);
  const jodiPartial = !isBlank(jodi) && !jodiFull && /\d/.test(jodi);

  let status = 'pending';
  if (openDeclared && closeDeclared && jodiFull) status = 'declared';
  else if (openDeclared || closeDeclared || jodiPartial) status = 'partial';

  return { open, jodi, close, status, raw };
}

export function isResultFullyPending(displayResult) {
  return parseDisplayResult(displayResult).status === 'pending';
}

export function formatMarketTime(time24) {
  if (!time24) return '';
  const [hours, minutes] = String(time24).split(':');
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return '';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes || '00'} ${ampm}`;
}

export function formatMarketTimeRange(startingTime, closingTime) {
  const start = formatMarketTime(startingTime);
  const end = formatMarketTime(closingTime);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
};

export function getRelativeDateLabel(date, t) {
  const key = toDateKeyIST(date);
  const todayKey = toDateKeyIST(new Date());
  if (!key || !todayKey) return null;

  if (key === todayKey) return t('notifications.today');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKeyIST(yesterday)) return t('notifications.yesterday');

  return null;
}
