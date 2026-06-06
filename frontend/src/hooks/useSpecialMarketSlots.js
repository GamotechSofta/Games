import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSpecialSlotsThunk,
  selectSpecialSlots,
  selectSpecialSlotsStatus,
} from '../store/slices/specialSlotsSlice';
import useSectionAutoRefresh from './useSectionAutoRefresh';

const REFRESH_MS = 2 * 60 * 1000;

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

  const refetch = useCallback(() => {
    if (!canFetch) return undefined;
    return dispatch(fetchSpecialSlotsThunk({ marketType, groupKey: group, marketLabel }));
  }, [dispatch, marketType, group, marketLabel, canFetch]);

  useEffect(() => {
    if (!canFetch) return undefined;
    void dispatch(fetchSpecialSlotsThunk({ marketType, groupKey: group, marketLabel }));
  }, [dispatch, marketType, group, marketLabel, canFetch]);

  useSectionAutoRefresh({
    enabled: canFetch,
    intervalMs: REFRESH_MS,
    immediate: false,
    onRefresh: refetch,
  });

  return {
    items,
    loading: loading && items.length === 0,
    refetch,
  };
}

export default useSpecialMarketSlots;
