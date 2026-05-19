/**
 * Resolve bet history labels to match Bid Options / gameRate names.
 */

export const inferPannaVariant = (betNumber) => {
  const s = String(betNumber || '').trim();
  if (!/^\d{3}$/.test(s)) return 'single';
  const [a, b, c] = s;
  if (a === b && b === c) return 'triple';
  if (a === b || b === c || a === c) return 'double';
  return 'single';
};

export const inferHalfSangamVariant = (betNumber) => {
  const s = (betNumber ?? '').toString().trim();
  if (!s.includes('-')) return null;
  const [a, b] = s.split('-').map((x) => (x || '').trim());
  if (/^\d{3}$/.test(a) && /^\d$/.test(b)) return 'open';
  if (/^\d$/.test(a) && /^\d{3}$/.test(b)) return 'close';
  return null;
};

/** Stable key for filtering — aligns with Bid Options categories. */
export const getBidOptionKey = (betType, betNumber) => {
  const key = String(betType || '').toLowerCase().trim();
  if (key === 'panna') {
    const v = inferPannaVariant(betNumber);
    if (v === 'triple') return 'triple-pana';
    if (v === 'double') return 'double-pana';
    return 'single-pana';
  }
  if (key === 'half-sangam') {
    const v = inferHalfSangamVariant(betNumber);
    if (v === 'open') return 'half-sangam-open';
    if (v === 'close') return 'half-sangam-close';
    return 'half-sangam';
  }
  return key || 'unknown';
};

const LITERAL_BID_LABELS = {
  'sp-common': 'SP Common',
  'dp-common': 'DP Common',
  'cp-common': 'CP',
  'sp-motor': 'SP Motor',
  'dp-motor': 'DP Motor',
  'sp-dp-motor': 'SP DP Motor',
  'sp-dp-motor-dp': 'SP DP Motor',
  'sp-dp-motor-tp': 'SP DP T Motor',
  'odd-even': 'Odd Even',
  'chart-game': 'Chart Game',
};

/** Display label — same names as BidOptions (gameRate i18n where available). */
export const getBidOptionLabel = (betType, betNumber, t) => {
  const key = String(betType || '').toLowerCase().trim();
  const optionKey = getBidOptionKey(betType, betNumber);

  if (optionKey === 'single-pana') return t('gameRate.singlePana');
  if (optionKey === 'double-pana') return t('gameRate.doublePana');
  if (optionKey === 'triple-pana') return t('gameRate.triplePana');
  if (optionKey === 'half-sangam-open') return t('gameRate.halfSangamOpen');
  if (optionKey === 'half-sangam-close') return t('gameRate.halfSangamClose');
  if (optionKey === 'half-sangam') return t('gameRate.halfSangam');

  if (key === 'single') return t('gameRate.singleDigit');
  if (key === 'jodi') return t('gameRate.jodi');
  if (key === 'full-sangam') return t('gameRate.fullSangam');

  if (LITERAL_BID_LABELS[key]) return LITERAL_BID_LABELS[key];

  return betType || t('bids.gameType.bet');
};

export const BID_OPTION_FILTER_ORDER = [
  'single',
  'jodi',
  'single-pana',
  'double-pana',
  'triple-pana',
  'half-sangam-open',
  'half-sangam-close',
  'half-sangam',
  'full-sangam',
  'sp-common',
  'dp-common',
  'cp-common',
  'sp-motor',
  'dp-motor',
  'sp-dp-motor',
  'sp-dp-motor-dp',
  'sp-dp-motor-tp',
  'odd-even',
  'chart-game',
];
