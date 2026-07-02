import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import notificationService from '@/services/notificationService';
import { useWebSocket } from '@/services/websocketService';

export function useUnreadNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useWebSocket('/notifications', {
    enabled: !!user?.id,
    onConnect: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onMessage: (event) => {
      if (
        event === 'new_notification' ||
        event === 'notification_created' ||
        event === 'notification_updated' ||
        event === 'bulk_notification'
      ) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
  });

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getNotifications({ user_id: user?.id }),
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const unreadCount = useMemo(() => {
    const notifications = Array.isArray(query.data) ? query.data : [];
    return notifications.filter((notification) => !notification.is_read).length;
  }, [query.data]);

  return {
    unreadCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
