import { queryClient } from '../queryClient';
import { API_BASE_URL } from '../config/api';
import {
  buildKingDemoSlots,
  mapKingBazaarSlot,
  mapStarlineSlot,
} from '../utils/specialMarketSlots';

const GROUPS_STALE_MS = 5 * 60 * 1000;
const SLOTS_STALE_MS = 30 * 1000;

export const specialBootstrapQueryKey = ['specialMarketsBootstrap'];

function groupKeyFromMarket(m, type) {
  const raw =
    type === 'king'
      ? m?.kingBazaarGroup || m?.king_bazaar_group
      : m?.starlineGroup || m?.starline_group;
  return (raw || '').toString().trim().toLowerCase();
}

function hydrateSlotsForType(marketType, slots, groups, mapper, labelFromGroup) {
  const mappedAll = (slots || []).map((m) => mapper(m, ''));
  queryClient.setQueryData(['specialMarketSlotsAll', marketType], mappedAll, {
    updatedAt: Date.now(),
  });

  for (const g of groups || []) {
    const key = (g?.key || '').toString().trim().toLowerCase();
    if (!key) continue;
    const label = labelFromGroup(g);
    const filtered = (slots || [])
      .filter((m) => groupKeyFromMarket(m, marketType) === key)
      .map((m) => mapper(m, label))
      .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));

    if (marketType === 'king' && filtered.length === 0) {
      queryClient.setQueryData(['specialMarketSlots', 'king', key], buildKingDemoSlots(label), {
        updatedAt: Date.now(),
      });
    } else {
      queryClient.setQueryData(['specialMarketSlots', marketType, key], filtered, {
        updatedAt: Date.now(),
      });
    }
  }
}

/** Push bootstrap payload into react-query caches used by Starline / King pages. */
export function hydrateSpecialMarketsCache(data) {
  if (!data) return;

  const starlineGroups = Array.isArray(data.starlineGroups) ? data.starlineGroups : [];
  const kingGroups = Array.isArray(data.kingGroups) ? data.kingGroups : [];

  queryClient.setQueryData(['marketGroups', 'starline'], starlineGroups, { updatedAt: Date.now() });
  queryClient.setQueryData(['marketGroups', 'king'], kingGroups, { updatedAt: Date.now() });

  if (Array.isArray(data.starlineSlots)) {
    hydrateSlotsForType(
      'startline',
      data.starlineSlots,
      starlineGroups,
      mapStarlineSlot,
      (g) => g?.label || 'Starline',
    );
  }

  if (Array.isArray(data.kingSlots)) {
    hydrateSlotsForType(
      'king',
      data.kingSlots,
      kingGroups,
      mapKingBazaarSlot,
      (g) => g?.label || 'King Bazaar',
    );
  }
}

export async function fetchSpecialMarketsBootstrap({ includeSlots = true } = {}) {
  const params = new URLSearchParams();
  if (!includeSlots) params.set('includeSlots', '0');
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/markets/special-bootstrap${qs ? `?${qs}` : ''}`,
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || 'Failed to load special markets');
  }
  return json.data;
}

export function prefetchSpecialMarketsBootstrap() {
  return queryClient.prefetchQuery({
    queryKey: specialBootstrapQueryKey,
    queryFn: async () => {
      const data = await fetchSpecialMarketsBootstrap({ includeSlots: true });
      hydrateSpecialMarketsCache(data);
      return data;
    },
    staleTime: SLOTS_STALE_MS,
  });
}

export { GROUPS_STALE_MS, SLOTS_STALE_MS };
