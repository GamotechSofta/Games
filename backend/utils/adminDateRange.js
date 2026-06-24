/** Parse from/to query (YYYY-MM-DD). If all=1 or from=all, returns null (all-time). Default to today if from/to missing. */
export function getAdminDateRange(fromStr, toStr, allTime) {
    if (allTime || fromStr === 'all' || toStr === 'all') {
        return { start: null, end: null, dateMatch: {} };
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(today);
    let end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
    if (fromStr && toStr) {
        const [y1, m1, d1] = fromStr.split('-').map(Number);
        const [y2, m2, d2] = toStr.split('-').map(Number);
        if (!Number.isNaN(y1) && !Number.isNaN(m1) && !Number.isNaN(d1)) {
            start = new Date(y1, m1 - 1, d1);
        }
        if (!Number.isNaN(y2) && !Number.isNaN(m2) && !Number.isNaN(d2)) {
            end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999);
        }
    }
    return {
        start,
        end,
        dateMatch: { createdAt: { $gte: start, $lte: end } },
    };
}
