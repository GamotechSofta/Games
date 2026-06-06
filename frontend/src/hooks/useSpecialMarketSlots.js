import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSpecialSlotsThunk,
  selectSpecialSlots,
  selectSpecialSlotsStatus,
} from '../store/slices/specialSlotsSlice';

/**
 * Cached time slots for one Starline or King Bazaar group.
 * Result updates arrive via Socket.IO (useMarketsSocketSync); no polling.
 * @param {{ marketType: 'startline' | 'king', groupKey?: string, marketLabel?: string, enabled?: boolean }} options
 */
export function useSpecialMarketSlots({
  marketType,
  groupKey = '',
  marketLabel = '',
  enabled = true,
} = {}) {
  const dispatch = useAppDispatch();
  const group = (groupKey || '').toString().trim().toLowerCase();
  const canFetch = Boolean(enabled && marketType && group);

  const items = useAppSelector(selectSpecialSlots(marketType, group));
  const { loading } = useAppSelector(selectSpecialSlotsStatus(marketType, group));

  const refetch = useCallback(() => {
    if (!canFetch) return undefined;
    return dispatch(fetchSpecialSlotsThunk({
      marketType,
      groupKey: group,
      marketLabel,
      force: true,
    }));
  }, [dispatch, marketType, group, marketLabel, canFetch]);

  useEffect(() => {
    if (!canFetch) return undefined;
    void dispatch(fetchSpecialSlotsThunk({ marketType, groupKey: group, marketLabel }));
  }, [dispatch, marketType, group, marketLabel, canFetch]);

  return {
    items,
    loading: loading && items.length === 0,
    refetch,
  };
}

export default useSpecialMarketSlots;
