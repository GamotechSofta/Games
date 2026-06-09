/**
 * Parse page/limit from query string for list APIs.
 */
export function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
    const page = Math.max(1, Number.parseInt(String(query?.page ?? '1'), 10) || 1);
    let limit = Number.parseInt(String(query?.limit ?? String(defaultLimit)), 10);
    if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
    limit = Math.min(maxLimit, limit);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

export function paginationMeta(page, limit, total) {
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    return {
        page,
        limit,
        total,
        totalPages,
    };
}

export function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
