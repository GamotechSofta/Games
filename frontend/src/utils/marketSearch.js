export function toMarketNameKey(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
}

export function marketMatchesQuery(market, query, getDisplayName) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const raw = (market.gameName || '').toLowerCase();
  if (raw.includes(q)) return true;

  if (getDisplayName) {
    const display = (getDisplayName(market.gameName) || '').toLowerCase();
    if (display.includes(q)) return true;
  }

  return false;
}

export function filterMarketsByQuery(markets, query, getDisplayName) {
  if (!query.trim()) return markets;
  return markets.filter((m) => marketMatchesQuery(m, query, getDisplayName));
}

/** Popular-flagged markets first, then the rest (stable within each group). */
export function sortMarketsPopularFirst(markets) {
  return [...markets].sort((a, b) => {
    const ap = a.showInPopular ? 0 : 1;
    const bp = b.showInPopular ? 0 : 1;
    return ap - bp;
  });
}

const marketMergeKey = (market) => {
  const id = market?.id ?? market?._id;
  if (id != null && String(id).trim()) return `id:${id}`;
  const name = (market?.gameName || market?.marketName || '').trim().toLowerCase();
  return name ? `name:${name}` : '';
};

/** Ensure every popular market is present in the all-markets list (dedupe by id or name). */
export function mergeMarketsWithPopular(allMarkets, popularMarkets) {
  const byKey = new Map();
  for (const market of allMarkets) {
    const key = marketMergeKey(market);
    if (key) byKey.set(key, market);
  }
  for (const market of popularMarkets) {
    const key = marketMergeKey(market);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, { ...existing, ...market, showInPopular: true });
    } else {
      byKey.set(key, { ...market, showInPopular: true });
    }
  }
  return sortMarketsPopularFirst([...byKey.values()]);
}
