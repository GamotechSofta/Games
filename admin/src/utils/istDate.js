const IST = 'Asia/Kolkata';

/** Current date in IST as YYYY-MM-DD */
export function getTodayIST(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

/** Format any Date as YYYY-MM-DD in IST */
export function formatYMDInIST(date) {
    return getTodayIST(date);
}

/** Parse YYYY-MM-DD as noon IST (safe for day arithmetic) */
export function parseYMDIST(ymd) {
    return new Date(`${String(ymd).slice(0, 10)}T12:00:00+05:30`);
}

/** Add days to a YYYY-MM-DD IST calendar date */
export function addDaysIST(ymd, days) {
    const d = parseYMDIST(ymd);
    d.setDate(d.getDate() + days);
    return formatYMDInIST(d);
}

/** Monday of the week containing ymd (IST) */
export function startOfWeekIST(ymd) {
    const d = parseYMDIST(ymd);
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'short' }).format(d);
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = dayMap[wd.slice(0, 3)] ?? 0;
    const mondayOffset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + mondayOffset);
    return formatYMDInIST(d);
}

/** First day of month in IST */
export function startOfMonthIST(ymd) {
    const [y, m] = String(ymd).slice(0, 10).split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-01`;
}
