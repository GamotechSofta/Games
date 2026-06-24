/** Shared bet verdict / cancel helpers (BetHistory + Bids). */

export const DEFAULT_RATES = {
  single: 10,
  jodi: 100,
  singlePatti: 150,
  doublePatti: 300,
  triplePatti: 1000,
  halfSangam: 5000,
  fullSangam: 10000,
};

export const sumDigits = (str) => [...String(str)].reduce((acc, c) => acc + (Number(c) || 0), 0);
export const lastDigit = (str) => sumDigits(str) % 10;

export const normalizeMarketName = (s) => (s || '').toString().trim().toLowerCase();

export const isStarlineMarketName = (marketTitle) => {
  const k = normalizeMarketName(marketTitle);
  return k.includes('starline') || k.includes('startline') || k.includes('star line') || k.includes('start line');
};

/** King Bazaar only — not every main market whose name contains "bazar". */
export const isKingBazaarMarketName = (marketTitle) => {
  const k = normalizeMarketName(marketTitle);
  if (!k) return false;
  if (k.includes('king bazaar') || k.includes('king bazar') || k.includes('kingbazaar') || k.includes('kingbazar')) {
    return true;
  }
  if (/\bking\b/.test(k) && /\bbaz(aa?r|ar)\b/.test(k)) return true;
  if (/^king[-\s]/.test(k)) return true;
  return false;
};

/** Prefer marketType from API; fall back to name heuristics. */
export function getBetMarketCategory(betOrMarket) {
  const market =
    betOrMarket?.marketId && typeof betOrMarket.marketId === 'object'
      ? betOrMarket.marketId
      : betOrMarket;
  const type = (market?.marketType || '').toString().toLowerCase();
  if (type === 'startline') return 'starline';
  if (type === 'king') return 'king';
  const name = (market?.marketName || betOrMarket?.marketName || '').toString();
  if (isStarlineMarketName(name)) return 'starline';
  if (isKingBazaarMarketName(name)) return 'king';
  return 'main';
}

export function isBetInMarketScope(bet, scope) {
  const s = (scope || '').toString().trim().toLowerCase();
  if (!s || s === 'all') return true;
  const cat = getBetMarketCategory(bet);
  if (s === 'starline' || s === 'startline') return cat === 'starline';
  if (s === 'king') return cat === 'king';
  if (s === 'main') return cat === 'main';
  return true;
}

export function isMarketInScope(marketName, marketType, scope) {
  return isBetInMarketScope({ marketId: { marketName, marketType } }, scope);
}

export function inferBetKind(betNumberRaw) {
  const s = (betNumberRaw ?? '').toString().trim();
  if (!s) return 'unknown';
  if (s.includes('-')) {
    const [a, b] = s.split('-').map((x) => (x || '').trim());
    if (/^\d{3}$/.test(a) && /^\d{3}$/.test(b)) return 'full-sangam';
    if (/^\d{3}$/.test(a) && /^\d$/.test(b)) return 'half-sangam-open';
    if (/^\d$/.test(a) && /^\d{3}$/.test(b)) return 'half-sangam-close';
    return 'unknown';
  }
  if (/^\d$/.test(s)) return 'digit';
  if (/^\d{2}$/.test(s)) return 'jodi';
  if (/^\d{3}$/.test(s)) return 'panna';
  return 'unknown';
}

const rateNum = (val, def) => (Number.isFinite(Number(val)) && Number(val) >= 0 ? Number(val) : def);

export function getPayoutMultiplier(kind, betNumberRaw, ratesMap) {
  const r = ratesMap && typeof ratesMap === 'object' ? ratesMap : DEFAULT_RATES;
  if (kind === 'digit') return rateNum(r.single, DEFAULT_RATES.single);
  if (kind === 'jodi') return rateNum(r.jodi, DEFAULT_RATES.jodi);
  if (kind === 'half-sangam-open' || kind === 'half-sangam-close') return rateNum(r.halfSangam, DEFAULT_RATES.halfSangam);
  if (kind === 'full-sangam') return rateNum(r.fullSangam, DEFAULT_RATES.fullSangam);
  if (kind === 'panna') {
    const s = (betNumberRaw ?? '').toString().trim();
    if (/^\d{3}$/.test(s)) {
      const a = s[0];
      const b = s[1];
      const c = s[2];
      const allSame = a === b && b === c;
      const twoSame = a === b || b === c || a === c;
      if (allSame) return rateNum(r.triplePatti, DEFAULT_RATES.triplePatti);
      if (twoSame) return rateNum(r.doublePatti, DEFAULT_RATES.doublePatti);
      return rateNum(r.singlePatti, DEFAULT_RATES.singlePatti);
    }
  }
  return 0;
}

export function evaluateBet({ market, betNumberRaw, amount, session, ratesMap }) {
  const opening = market?.openingNumber && /^\d{3}$/.test(String(market.openingNumber)) ? String(market.openingNumber) : null;
  const closing = market?.closingNumber && /^\d{3}$/.test(String(market.closingNumber)) ? String(market.closingNumber) : null;
  const openDigit = opening ? String(lastDigit(opening)) : null;
  const closeDigit = closing ? String(lastDigit(closing)) : null;
  const jodi = openDigit != null && closeDigit != null ? `${openDigit}${closeDigit}` : null;

  const betNumber = (betNumberRaw ?? '').toString().trim();
  const kind = inferBetKind(betNumber);
  const sess = (session || '').toString().trim().toUpperCase();

  const declared =
    kind === 'digit'
      ? (sess === 'OPEN' ? !!openDigit : sess === 'CLOSE' ? !!closeDigit : !!(openDigit && closeDigit))
      : kind === 'panna'
        ? (sess === 'OPEN' ? !!opening : sess === 'CLOSE' ? !!closing : !!(opening && closing))
        : kind === 'jodi'
          ? !!jodi
          : kind === 'half-sangam-open'
            ? !!(opening && openDigit)
            : kind === 'half-sangam-close' || kind === 'full-sangam'
              ? !!(opening && closing)
              : false;

  if (!declared) return { state: 'pending', kind, payout: 0 };

  let won = false;
  if (kind === 'digit') {
    if (sess === 'OPEN') won = betNumber === openDigit;
    else if (sess === 'CLOSE') won = betNumber === closeDigit;
    else won = betNumber === openDigit || betNumber === closeDigit;
  } else if (kind === 'jodi') {
    won = betNumber === jodi;
  } else if (kind === 'panna') {
    if (sess === 'OPEN') won = betNumber === opening;
    else if (sess === 'CLOSE') won = betNumber === closing;
    else won = betNumber === opening || betNumber === closing;
  } else if (kind === 'full-sangam') {
    won = betNumber === `${opening}-${closing}`;
  } else if (kind === 'half-sangam-open') {
    won = betNumber === `${opening}-${openDigit}`;
  } else if (kind === 'half-sangam-close') {
    won = betNumber === `${openDigit}-${closing}`;
  }

  if (!won) return { state: 'lost', kind, payout: 0 };

  const mul = getPayoutMultiplier(kind, betNumber, ratesMap);
  const payout = mul > 0 ? (Number(amount) || 0) * mul : 0;
  return { state: 'won', kind, payout };
}

function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function normalizeTimeStr(timeStr) {
  const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
  return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
}

function parseISTDateTime(isoStr) {
  const d = new Date(isoStr);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** @param {(key: string) => string} [t] optional i18n */
export function canCancelBet(bet, t) {
  const msg = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);

  if (!bet || bet.status !== 'pending') {
    return { canCancel: false, reason: msg('bids.statusUnknown', `Status: ${bet?.status || 'unknown'}`) };
  }

  const market = bet.marketId;
  if (!market) {
    return { canCancel: false, reason: msg('bids.marketNotFound', 'Market not found') };
  }

  const now = new Date();
  const betPlacedAt = new Date(bet.createdAt);
  const timeSinceBetPlaced = (now - betPlacedAt) / 1000 / 60;

  if (timeSinceBetPlaced > 30) {
    return { canCancel: false, reason: msg('bids.canOnlyCancelWithin30Min', 'Can only cancel within 30 minutes of placing') };
  }

  const closeStr = (market?.closingTime || '').toString().trim();
  if (!closeStr) {
    return { canCancel: false, reason: msg('bids.marketTimingNotConfigured', 'Market timing not configured') };
  }

  try {
    const todayIST = getTodayIST();
    const openAt = parseISTDateTime(`${todayIST}T00:00:00+05:30`);
    let closeAt = parseISTDateTime(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);

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

    const timeUntilClosing = (closeAt - now.getTime()) / 1000 / 60;
    if (timeUntilClosing < 30) {
      return { canCancel: false, reason: msg('bids.cannotCancelWithin30MinOfClosing', 'Cannot cancel within 30 minutes of market closing') };
    }

    return { canCancel: true, reason: '' };
  } catch {
    return { canCancel: false, reason: msg('bids.marketTimingError', 'Error checking market timing') };
  }
}
