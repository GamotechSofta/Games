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
