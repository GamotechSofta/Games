import { useQuery } from '@tanstack/react-query';
import { getRatesCurrent } from '../api/bets';

export const GAME_RATES_STALE_MS = 30 * 60 * 1000;

export function gameRatesQueryKey() {
  return ['gameRates', 'current'];
}

const DEFAULT_RATES = {
  single: 10,
  jodi: 100,
  singlePatti: 150,
  doublePatti: 300,
  triplePatti: 1000,
  halfSangam: 5000,
  fullSangam: 10000,
};

export async function fetchGameRates() {
  const res = await getRatesCurrent();
  if (res?.success && res.data) return res.data;
  return DEFAULT_RATES;
}

export default function useGameRates({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: gameRatesQueryKey(),
    enabled,
    queryFn: fetchGameRates,
    staleTime: GAME_RATES_STALE_MS,
    gcTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous ?? DEFAULT_RATES,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    rates: query.data || DEFAULT_RATES,
    loading: query.isLoading && !query.data,
    error: query.error?.message || '',
    refetch: query.refetch,
  };
}

export { DEFAULT_RATES };
