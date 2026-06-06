import { useMemo } from 'react';
import useMainMarkets from './useMainMarkets';
import { useAppSelector } from '../store/hooks';
import { selectSpecialSlots } from '../store/slices/specialSlotsSlice';

function marketIdsMatch(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Merge navigation state market with latest Redux data (updated instantly on admin declare).
 */
export function useLiveMarket(initialMarket, { groupKey = '', marketType = '' } = {}) {
  const { markets: mainMarkets } = useMainMarkets();
  const type = (marketType || initialMarket?.marketType || 'main').toString().toLowerCase();
  const group = (groupKey || '').toString().trim().toLowerCase();
  const isSpecial = (type === 'startline' || type === 'starline' || type === 'king') && Boolean(group);
  const specialType = type === 'king' ? 'king' : 'startline';
  const slotItems = useAppSelector(selectSpecialSlots(specialType, isSpecial ? group : ''));

  return useMemo(() => {
    if (!initialMarket) return initialMarket;

    const id = initialMarket.id || initialMarket._id;
    if (!id) return initialMarket;

    if (type === 'main' || !type) {
      const fresh = mainMarkets.find((m) => marketIdsMatch(m.id, id));
      if (fresh) {
        return {
          ...initialMarket,
          ...fresh,
          id: fresh.id,
          _id: fresh.id,
          gameName: fresh.gameName || initialMarket.gameName,
          marketName: fresh.gameName || initialMarket.marketName,
          result: fresh.result,
          displayResult: fresh.result,
          status: fresh.status,
          openingNumber: fresh.openingNumber,
          closingNumber: fresh.closingNumber,
        };
      }
      return initialMarket;
    }

    if (isSpecial) {
      const fresh = slotItems.find((s) => marketIdsMatch(s.id || s._id, id));
      if (fresh) {
        return {
          ...initialMarket,
          ...fresh,
          id: fresh.id || fresh._id,
          _id: fresh.id || fresh._id,
          displayResult: fresh.displayResult || initialMarket.displayResult,
          openingNumber: fresh.openingNumber,
          closingNumber: fresh.closingNumber,
          status: fresh.status,
        };
      }
    }

    return initialMarket;
  }, [initialMarket, type, isSpecial, mainMarkets, slotItems]);
}

export default useLiveMarket;
