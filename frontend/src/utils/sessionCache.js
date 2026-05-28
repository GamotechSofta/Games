const memoryCache = new Map();

const now = () => Date.now();

const toRecord = (value, ttlMs) => ({
  value,
  expiresAt: now() + Math.max(0, ttlMs || 0),
});

const isFresh = (record) =>
  Boolean(record) && typeof record.expiresAt === 'number' && record.expiresAt > now();

export const getSessionCache = (key) => {
  const memoryRecord = memoryCache.get(key);
  if (isFresh(memoryRecord)) return memoryRecord.value;
  if (memoryRecord) memoryCache.delete(key);

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isFresh(parsed)) {
      sessionStorage.removeItem(key);
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
};

export const setSessionCache = (key, value, ttlMs) => {
  const record = toRecord(value, ttlMs);
  memoryCache.set(key, record);
  try {
    sessionStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Ignore quota/security failures.
  }
  return value;
};

export const clearSessionCache = (key) => {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

export const createSharedFetcher = () => {
  const inFlight = new Map();

  return async (key, fetcher) => {
    if (!inFlight.has(key)) {
      const run = Promise.resolve(fetcher()).finally(() => inFlight.delete(key));
      inFlight.set(key, run);
    }
    return inFlight.get(key);
  };
};
