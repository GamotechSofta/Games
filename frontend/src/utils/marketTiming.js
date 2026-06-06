const IST_WEEKDAY_SHORT = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** IST weekday 0=Sun … 6=Sat via Asia/Kolkata (matches backend). */
export function getISTWeekdayIndex(now = new Date()) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
    });
    let wd;
    if (typeof dtf.formatToParts === 'function') {
      const parts = dtf.formatToParts(now);
      wd = parts.find((p) => p.type === 'weekday')?.value;
    } else {
      wd = dtf.format(now);
    }
    if (wd) {
      const key = wd.length >= 3 ? wd.slice(0, 3) : wd;
      if (IST_WEEKDAY_SHORT[key] !== undefined) return IST_WEEKDAY_SHORT[key];
    }
  } catch {
    /* ignore */
  }
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const ref = new Date(`${ymd}T12:00:00+05:30`);
  if (!isNaN(ref.getTime())) return ref.getUTCDay();
  return new Date(now.getTime()).getUTCDay();
}

/** Effective open days: unique sorted 0–6. Null/omit/non-array = all week (legacy). */
export function normalizeMarketOpenDays(openDays) {
  let arr = openDays;
  if (arr != null && typeof arr === 'object' && !Array.isArray(arr)) {
    arr = Object.values(arr);
  }
  if (arr == null || !Array.isArray(arr)) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const set = new Set();
  for (const d of arr) {
    const n = Number(d);
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
  }
  if (set.size === 0) return [0, 1, 2, 3, 4, 5, 6];
  return [...set].sort((a, b) => a - b);
}

/** True if today (IST) is a scheduled operating day for the market. */
export function isMarketOpenOnISTDay(market, now = new Date()) {
  const allowed = normalizeMarketOpenDays(market?.openDays);
  return allowed.includes(getISTWeekdayIndex(now));
}

/**
 * Check if betting is allowed for a market at the given time.
 * betClosureTime (seconds) is subtracted from opening and closing deadlines (matches backend).
 * - While before opening and outside the pre-open closure window: OPEN and CLOSE allowed (closeOnly: false).
 * - From opening time until close deadline, or inside the pre-open closure window: only CLOSE (closeOnly: true).
 * - After close deadline: no betting.
 * Uses IST (Asia/Kolkata) to match market reset and backend.
 *
 * @param {{ startingTime?: string, closingTime: string, betClosureTime?: number, openDays?: number[] }} market
 * @param {Date} [now]
 * @returns {{ allowed: boolean, closeOnly?: boolean, message?: string }}
 */
export function isBettingAllowed(market, now = new Date()) {
  if (!isMarketOpenOnISTDay(market, now)) {
    return {
      allowed: false,
      message: 'Market is closed today (weekly schedule).',
    };
  }
  const closeStr = (market?.closingTime || '').toString().trim();
  const betClosureSec = Number(market?.betClosureTime);
  const closureSec = Number.isFinite(betClosureSec) && betClosureSec >= 0 ? betClosureSec : 0;

  if (!closeStr) {
    return { allowed: false, message: 'Market timing not configured.' };
  }

  const todayIST = getTodayIST();
  const startStr = (market?.startingTime || '').toString().trim();
  
  // Use startingTime if provided, otherwise default to midnight
  const openAt = startStr 
    ? parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(startStr)}+05:30`)
    : parseISTDateTimeMs(`${todayIST}T00:00:00+05:30`);
  
  let closeAt = parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);
  
  if (!openAt || !closeAt) {
    return { allowed: false, message: 'Invalid market time.' };
  }

  // If closing time is before or equal to opening time, market spans midnight
  if (closeAt <= openAt) {
    const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
    baseDate.setDate(baseDate.getDate() + 1);
    const nextDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(baseDate);
    closeAt = parseISTDateTimeMs(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
  }

  const closureMs = closureSec * 1000;
  const lastOpenBetAt = openAt - closureMs;
  const lastCloseBetAt = closeAt - closureMs;
  const nowMs = now.getTime();

  if (nowMs > lastCloseBetAt) {
    return {
      allowed: false,
      message: `Betting closed. Closing time has passed. You can place bets until ${closureSec > 0 ? 'the set closure time.' : 'closing time.'}`,
    };
  }

  const canPlaceOpen = nowMs < openAt && nowMs <= lastOpenBetAt;
  if (!canPlaceOpen) {
    return { allowed: true, closeOnly: true };
  }
  return { allowed: true };
}

export function getTodayIST(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function normalizeTimeStr(timeStr) {
  const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
  return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
}

export function parseISTDateTimeMs(isoStr) {
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? null : d.getTime();
}

/** Next midnight IST (market day rollover) strictly after `now`. */
export function getNextMidnightISTMs(now = new Date()) {
  const nowMs = now.getTime();
  const todayIST = getTodayIST(now);
  let midnight = parseISTDateTimeMs(`${todayIST}T00:00:00+05:30`);
  if (midnight != null && midnight > nowMs) return midnight;

  const base = new Date(`${todayIST}T12:00:00+05:30`);
  base.setDate(base.getDate() + 1);
  const nextDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base);
  return parseISTDateTimeMs(`${nextDay}T00:00:00+05:30`);
}

/**
 * Opening/closing/closure IST timestamps for one market on a calendar day (YYYY-MM-DD).
 * @returns {number[]}
 */
export function getMarketTimingEventsForDate(market, dateIST) {
  const closeStr = (market?.closingTime || '').toString().trim();
  if (!closeStr || !dateIST) return [];

  const startStr = (market?.startingTime || '').toString().trim();
  const betClosureSec = Number(market?.betClosureTime);
  const closureSec = Number.isFinite(betClosureSec) && betClosureSec >= 0 ? betClosureSec : 0;
  const closureMs = closureSec * 1000;

  const openAt = startStr
    ? parseISTDateTimeMs(`${dateIST}T${normalizeTimeStr(startStr)}+05:30`)
    : parseISTDateTimeMs(`${dateIST}T00:00:00+05:30`);

  let closeAt = parseISTDateTimeMs(`${dateIST}T${normalizeTimeStr(closeStr)}+05:30`);
  if (openAt == null || closeAt == null) return [];

  if (closeAt <= openAt) {
    const baseDate = new Date(`${dateIST}T12:00:00+05:30`);
    baseDate.setDate(baseDate.getDate() + 1);
    const nextDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(baseDate);
    closeAt = parseISTDateTimeMs(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
    if (closeAt == null) return [];
  }

  const events = [openAt, closeAt];
  if (closureSec > 0) {
    events.push(openAt - closureMs);
    events.push(closeAt - closureMs);
  }
  return events;
}

/**
 * Future refresh timestamps for a market (today + tomorrow IST boundaries).
 * @returns {number[]}
 */
export function collectMarketRefreshEvents(market, now = new Date()) {
  const nowMs = now.getTime();
  const todayIST = getTodayIST(now);
  const tomorrowBase = new Date(`${todayIST}T12:00:00+05:30`);
  tomorrowBase.setDate(tomorrowBase.getDate() + 1);
  const tomorrowIST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrowBase);

  const raw = [
    ...getMarketTimingEventsForDate(market, todayIST),
    ...getMarketTimingEventsForDate(market, tomorrowIST),
  ];

  return raw.filter((ts) => typeof ts === 'number' && ts > nowMs + 250);
}

/**
 * Next refresh time across all markets: opening, closure, closing, and midnight IST.
 * @param {Array} markets
 * @param {Date} [now]
 * @returns {number|null} epoch ms
 */
export function getNextMarketRefreshMs(markets, now = new Date()) {
  const nowMs = now.getTime();
  const candidates = [getNextMidnightISTMs(now)];

  for (const market of markets || []) {
    candidates.push(...collectMarketRefreshEvents(market, now));
  }

  const future = candidates.filter((ts) => typeof ts === 'number' && ts > nowMs + 250);
  if (!future.length) return null;
  return Math.min(...future);
}

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (!Number.isFinite(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const min = Number.isFinite(m) ? String(m).padStart(2, '0') : '00';
  return `${h12}:${min} ${ampm}`;
}

/**
 * True if current time has reached or passed the market's closing time (market is automatically closed).
 * Uses IST (Asia/Kolkata) to match backend.
 * Handles markets that span midnight (e.g., 11 PM - 1 AM) correctly by considering startingTime.
 */
export function isPastClosingTime(market, now = new Date()) {
  const closeStr = (market?.closingTime || '').toString().trim();
  if (!closeStr) return false;
  
  const todayIST = getTodayIST();
  const startStr = (market?.startingTime || '').toString().trim();
  
  // Use startingTime if provided, otherwise default to midnight
  const openAt = startStr 
    ? parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(startStr)}+05:30`)
    : parseISTDateTimeMs(`${todayIST}T00:00:00+05:30`);
  
  let closeAt = parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);
  
  if (!openAt || !closeAt) return false;
  
  const nowMs = now.getTime();
  
  // If closing time is before or equal to opening time, market spans midnight
  // Example: 11 PM (23:00) to 1 AM (01:00) - closing is next day
  if (closeAt <= openAt) {
    // Market closes on the next day
    const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
    baseDate.setDate(baseDate.getDate() + 1);
    const nextDayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(baseDate);
    closeAt = parseISTDateTimeMs(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
    if (!closeAt) return false;
    
    // Check if we're past the closing time on the next day
    // Use > instead of >= so market is accessible until after closing time
    return nowMs > closeAt;
  }
  
  // Market closes on the same day (e.g., 9 AM - 5 PM)
  // Use > instead of >= so market is accessible until after closing time
  return nowMs > closeAt;
}

/** Tomorrow's date in IST (YYYY-MM-DD) for scheduling bets */
export function getTomorrowIST() {
  const todayIST = getTodayIST();
  const d = new Date(`${todayIST}T12:00:00+05:30`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD to dd-mm-yyyy for display */
export function formatDateDisplay(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}
