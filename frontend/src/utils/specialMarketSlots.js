import { isPastClosingTime } from './marketTiming';

export function mapStarlineSlot(m, marketLabel) {
  const st = (m.startingTime || '').toString().trim().slice(0, 5);
  const status = isPastClosingTime(m)
    ? 'closed'
    : (m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'closed' : 'open');
  return {
    id: m._id,
    marketName: m.marketName || m.gameName || marketLabel,
    startingTime: st || null,
    closingTime: m.closingTime || m.startingTime || null,
    openingNumber: m.openingNumber || null,
    closingNumber: m.closingNumber || null,
    displayResult: m.displayResult || '***-**-***',
    status,
    _raw: m,
    _isDemo: false,
  };
}

export function mapKingBazaarSlot(m, marketLabel) {
  const st = (m.startingTime || '').toString().trim().slice(0, 5);
  const status = isPastClosingTime(m)
    ? 'closed'
    : (m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'closed' : 'open');
  return {
    id: m._id,
    marketName: m.marketName || m.gameName || marketLabel,
    startingTime: st || null,
    closingTime: m.closingTime || m.startingTime || null,
    openingNumber: m.openingNumber || null,
    closingNumber: m.closingNumber || null,
    displayResult: m.displayResult || '***-**-***',
    status,
    _raw: m,
    _isDemo: false,
  };
}

export const KING_BAZAAR_DEMO_SLOTS = [
  '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00',
];

export function buildKingDemoSlots(marketLabel) {
  return KING_BAZAAR_DEMO_SLOTS.map((time) => ({
    id: `king-demo-${time}`,
    marketName: marketLabel,
    startingTime: time,
    closingTime: time,
    openingNumber: null,
    closingNumber: null,
    displayResult: '***-**-***',
    status: 'open',
    _raw: null,
    _isDemo: true,
  }));
}
