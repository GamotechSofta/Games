import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import { queryClient } from '../queryClient';
import { SLOTS_STALE_MS } from '../api/specialMarketsBootstrap';
import {
  buildKingDemoSlots,
  mapKingBazaarSlot,
  mapStarlineSlot,
} from '../utils/specialMarketSlots';

const STALE_MS = SLOTS_STALE_MS;
const REFRESH_MS = 60 * 1000;

function buildMarketsUrl(marketType, groupKey) {
  const params = new URLSearchParams({ marketType, fields: 'home' });
  const group = (groupKey || '').toString().trim().toLowerCase();
  if (marketType === 'startline' && group) {
    params.set('starlineGroup', group);
  }
  if (marketType === 'king' && group) {
    params.set('kingBazaarGroup', group);
  }
  return `${API_BASE_URL}/markets/get-markets?${params.toString()}`;
}

async function fetchSpecialSlots(marketType, groupKey, marketLabel) {
  const res = await fetch(buildMarketsUrl(marketType, groupKey));
  const data = await res.json();
  const list = Array.isArray(data?.data) ? data.data : [];
  const mapper = marketType === 'king' ? mapKingBazaarSlot : mapStarlineSlot;
  const mapped = list
    .map((m) => mapper(m, marketLabel))
    .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));

  if (marketType === 'king' && mapped.length === 0 && groupKey) {
    return buildKingDemoSlots(marketLabel);
  }
  return mapped;
}

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
  const group = (groupKey || '').toString().trim().toLowerCase();
  const needsGroup = true;
  const canFetch = Boolean(enabled && marketType && (!needsGroup || group));

  const query = useQuery({
    queryKey: ['specialMarketSlots', marketType, group],
    enabled: canFetch,
    queryFn: () => fetchSpecialSlots(marketType, group, marketLabel),
    initialData: () => {
      const cached = queryClient.getQueryData(['specialMarketSlots', marketType, group]);
      return Array.isArray(cached) && cached.length ? cached : undefined;
    },
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    refetchInterval: REFRESH_MS,
    retry: 1,
  });

  return {
    items: query.data || [],
    loading: query.isPending && !(query.data?.length),
    refetch: query.refetch,
  };
}

export default useSpecialMarketSlots;
