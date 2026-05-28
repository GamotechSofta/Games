import { isPastClosingTime } from './marketTiming';

export const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const getMarketStatus = (market) => {
  if (isPastClosingTime(market)) return 'closed';
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  if (hasOpening && hasClosing) return 'closed';
  if (hasOpening && !hasClosing) return 'running';
  return 'open';
};

export const transformMarkets = (items) =>
  (items || [])
    .filter((market) => market.marketType !== 'startline')
    .map((market) => ({
      id: market._id,
      gameName: market.marketName,
      showInPopular: Boolean(market.showInPopular),
      timeRange: `${formatTime12h(market.startingTime)} - ${formatTime12h(market.closingTime)}`,
      result: market.displayResult || '***-**-***',
      status: getMarketStatus(market),
      timer: null,
      winNumber: market.winNumber,
      startingTime: market.startingTime,
      closingTime: market.closingTime,
      betClosureTime: market.betClosureTime ?? 0,
      openingNumber: market.openingNumber,
      closingNumber: market.closingNumber,
      marketType: market.marketType || 'main',
    }));

