import { useQuery } from '@tanstack/react-query';
import { getUnreadMessageCount } from '@/src/api/messages';
import { getUnreadNotificationCount } from '@/src/api/notifications';
import { useAuth } from '@/src/hooks/use-auth';

const COUNT_STALE_MS = 60 * 1000;

/**
 * Topbar rozetleri için paylaşımlı okunmamış sayaçları (web `useNavigationData` muadili).
 *
 * react-query cache global olduğu için sayaçlar tab geçişlerinde sıfırlanmaz. Aynı cache
 * anahtarlarını SignalR context'i canlı event'lerle günceller (`setQueryData`),
 * foreground/reconnect ise refetch ile tazeler. Böylece "initial fetch yok" ve
 * "navigasyonda 0'a düşüyor" hatalarının ikisi de çözülür.
 */
export function useUnreadCounts() {
  const { isAuthenticated } = useAuth();

  const messagesQuery = useQuery({
    queryKey: ['unread-message-count'],
    queryFn: getUnreadMessageCount,
    enabled: isAuthenticated,
    staleTime: COUNT_STALE_MS,
  });

  const notificationsQuery = useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: getUnreadNotificationCount,
    enabled: isAuthenticated,
    staleTime: COUNT_STALE_MS,
  });

  return {
    unreadMessages: messagesQuery.data?.count ?? 0,
    unreadNotifications: notificationsQuery.data?.count ?? 0,
  };
}
