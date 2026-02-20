/**
 * Check if betting is allowed for a market at the given time.
 * Market opens at midnight (00:00) IST and closes at closing time each day.
 * Uses IST (Asia/Kolkata) to match market reset and backend.
 */
export function isBettingAllowed(market, now = new Date()) {
  const closeStr = (market?.closingTime || '').toString().trim();
  const betClosureSec = Number(market?.betClosureTime);
  const closureSec = Number.isFinite(betClosureSec) && betClosureSec >= 0 ? betClosureSec : 0;

  if (!closeStr) {
    return { allowed: false, message: 'Market timing not configured.' };
  }

  const todayIST = getTodayIST();
  const openAt = parseISTDateTime(`${todayIST}T00:00:00+05:30`);
  let closeAt = parseISTDateTime(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);
  if (!openAt || !closeAt) {
    return { allowed: false, message: 'Invalid market time.' };
  }

  if (closeAt <= openAt) {
    const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
    baseDate.setDate(baseDate.getDate() + 1);
    const nextDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(baseDate);
    closeAt = parseISTDateTime(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
  }

  const lastBetAt = closeAt - closureSec * 1000;
  const nowMs = now.getTime();

  if (nowMs < openAt) {
    return {
      allowed: false,
      message: 'Betting opens at 12:00 AM (midnight). You can place bets after midnight.',
    };
  }
  if (nowMs > lastBetAt) {
    return {
      allowed: false,
      message: `Betting has closed for this market. Bets are not accepted after ${closureSec > 0 ? 'the set closure time.' : 'closing time.'}`,
    };
  }
  return { allowed: true };
}

export function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getTomorrowIST() {
  const todayIST = getTodayIST();
  const d = new Date(`${todayIST}T12:00:00+05:30`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function formatDateDisplay(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}

function normalizeTimeStr(timeStr) {
  const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
  return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
}

function parseISTDateTime(isoStr) {
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export function isPastClosingTime(market, now = new Date()) {
  const closeStr = (market?.closingTime || '').toString().trim();
  if (!closeStr) return false;
  const todayIST = getTodayIST();
  const openAt = parseISTDateTime(`${todayIST}T00:00:00+05:30`);
  let closeAt = parseISTDateTime(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);
  if (!openAt || !closeAt) return false;
  if (closeAt <= openAt) {
    const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
    baseDate.setDate(baseDate.getDate() + 1);
    const nextDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(baseDate);
    closeAt = parseISTDateTime(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
  }
  return now.getTime() >= closeAt;
}
