import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import useHomeBootstrap from './useHomeBootstrap';

const DEFAULT_STALE_MS = 3 * 60 * 1000;
const DEFAULT_LIMIT = 12;

const getBaseApi = () => API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export default function useGameList({ staleMs = DEFAULT_STALE_MS, limit = DEFAULT_LIMIT } = {}) {
  const useBootstrap = limit === DEFAULT_LIMIT;
  const bootstrap = useHomeBootstrap({ marketLimit: 24, gameLimit: limit });
  const gamesQuery = useQuery({
    queryKey: ['gameList', limit],
    enabled: !useBootstrap,
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
    if (useBootstrap) return bootstrap.data?.games || [];
    return gamesQuery.data || [];
  }, [useBootstrap, bootstrap.data, gamesQuery.data]);

  return {
    games,
    loading: useBootstrap ? bootstrap.isLoading : gamesQuery.isLoading,
    error: (useBootstrap ? bootstrap.error : gamesQuery.error)?.message || '',
    refetch: () => (useBootstrap ? bootstrap.refetch() : gamesQuery.refetch()),
  };
}
