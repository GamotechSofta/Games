const IST = 'Asia/Kolkata';

const IST_WEEKDAY_SHORT = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getISTWeekdayIndex(now = new Date()) {
    try {
        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: IST,
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
    const ymd = getTodayIST(now);
    const ref = new Date(`${ymd}T12:00:00+05:30`);
    if (!isNaN(ref.getTime())) return ref.getUTCDay();
    return new Date(now.getTime()).getUTCDay();
}

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

export function isMarketOpenOnISTDay(market, now = new Date()) {
    const allowed = normalizeMarketOpenDays(market?.openDays);
    return allowed.includes(getISTWeekdayIndex(now));
}

/**
 * Market betting window (IST).
 * - Before startingTime: open + close declaration bets (jodi / sangam) allowed.
 * - From startingTime until close deadline: close-session patti/digit only (closeOnly).
 * - After close deadline: no betting.
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

    const todayIST = getTodayIST(now);
    const startStr = (market?.startingTime || '').toString().trim();

    const openAt = startStr
        ? parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(startStr)}+05:30`)
        : parseISTDateTimeMs(`${todayIST}T00:00:00+05:30`);

    let closeAt = parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);

    if (!openAt || !closeAt) {
        return { allowed: false, message: 'Invalid market time format.' };
    }

    if (closeAt <= openAt) {
        const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
        baseDate.setDate(baseDate.getDate() + 1);
        const nextDayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: IST,
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
            message: `Betting has closed for this market. Bets are not accepted after ${closureSec > 0 ? 'the set closure time.' : 'closing time.'}`,
        };
    }

    const canPlaceOpen = nowMs < openAt && nowMs <= lastOpenBetAt;
    if (!canPlaceOpen) {
        return { allowed: true, closeOnly: true };
    }
    return { allowed: true };
}

export const CLOSE_DECLARATION_BET_TYPES = new Set(['jodi', 'half-sangam', 'full-sangam']);

export function isCloseDeclarationBetType(betType) {
    return CLOSE_DECLARATION_BET_TYPES.has((betType || '').toString().trim().toLowerCase());
}

function getTodayIST(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
}

function normalizeTimeStr(timeStr) {
    const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
    return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
}

function parseISTDateTimeMs(isoStr) {
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Check if market's betting has closed (past closing time for today).
 */
export function isBettingClosed(market, now = new Date()) {
    const closeStr = (market?.closingTime || '').toString().trim();
    if (!closeStr) return false;

    const todayIST = getTodayIST(now);
    const startStr = (market?.startingTime || '').toString().trim();

    const openAt = startStr
        ? parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(startStr)}+05:30`)
        : parseISTDateTimeMs(`${todayIST}T00:00:00+05:30`);

    let closeAt = parseISTDateTimeMs(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);
    if (!openAt || !closeAt) return false;

    if (closeAt <= openAt) {
        const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
        baseDate.setDate(baseDate.getDate() + 1);
        const nextDayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: IST,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(baseDate);
        closeAt = parseISTDateTimeMs(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
        if (!closeAt) return false;
    }

    return now.getTime() > closeAt;
}
