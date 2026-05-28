import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCachedNotificationUnreadCount, getNotificationUnreadCount } from '../utils/notificationCount';

export default function useNotificationCount() {
  const query = useQuery({
    queryKey: ['notificationCount'],
    queryFn: () => getNotificationUnreadCount({ force: true }),
    initialData: getCachedNotificationUnreadCount(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    const onSeen = () => query.refetch();
    const onLogin = () => query.refetch();
    window.addEventListener('notificationsSeen', onSeen);
    window.addEventListener('userLogin', onLogin);
    return () => {
      window.removeEventListener('notificationsSeen', onSeen);
      window.removeEventListener('userLogin', onLogin);
    };
  }, [query]);

  return {
    notificationCount: Number(query.data || 0),
    refreshNotificationCount: (force = false) => query.refetch({ cancelRefetch: !force }),
  };
}

