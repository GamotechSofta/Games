import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSpecialSlotsThunk,
  selectSpecialSlots,
  selectSpecialSlotsStatus,
} from '../store/slices/specialSlotsSlice';

const REFRESH_MS = 60 * 1000;

/**
 * Cached time slots for one Starline or King Bazaar group.
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

  useEffect(() => {
    if (!canFetch) return undefined;
    void dispatch(fetchSpecialSlotsThunk({ marketType, groupKey: group, marketLabel }));
    const id = setInterval(() => {
      void dispatch(fetchSpecialSlotsThunk({ marketType, groupKey: group, marketLabel }));
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [dispatch, marketType, group, marketLabel, canFetch]);

  return {
    items: query.data || [],
    loading: query.isPending && !(query.data?.length),
    refetch: query.refetch,
  };
}

export default useSpecialMarketSlots;
