import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import useHomeBootstrap from './useHomeBootstrap';

const DEFAULT_STALE_MS = 3 * 60 * 1000;
const DEFAULT_LIMIT = 12;

const getBaseApi = () => API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export default function useGameList({ staleMs = DEFAULT_STALE_MS, limit = DEFAULT_LIMIT } = {}) {
  const useBootstrap = limit === DEFAULT_LIMIT;
  const bootstrap = useHomeBootstrap({ marketLimit: 24, gameLimit: limit, enabled: useBootstrap });
  const bootstrapUnavailable =
    bootstrap.error?.code === 'HOME_BOOTSTRAP_UNAVAILABLE' ||
    bootstrap.error?.message === 'HOME_BOOTSTRAP_UNAVAILABLE';

  const gamesQuery = useQuery({
    queryKey: ['gameList', limit],
    enabled: !useBootstrap || bootstrapUnavailable,
    queryFn: async () => {
      const params = new URLSearchParams({
        fields: 'home',
        limit: String(limit),
      });
      const res = await fetch(`${getBaseApi()}/api/game/list?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load games');
      return data.data || [];
    },
    staleTime: staleMs,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const games = useMemo(() => {
    if (useBootstrap && !bootstrapUnavailable) return bootstrap.data?.games || [];
    return gamesQuery.data || [];
  }, [useBootstrap, bootstrapUnavailable, bootstrap.data, gamesQuery.data]);

  return {
    games,
    loading: useBootstrap && !bootstrapUnavailable ? bootstrap.isLoading : gamesQuery.isLoading,
    error:
      (useBootstrap && !bootstrapUnavailable ? bootstrap.error : gamesQuery.error)?.message || '',
    refetch: () =>
      (useBootstrap && !bootstrapUnavailable ? bootstrap.refetch() : gamesQuery.refetch()),
  };
}
