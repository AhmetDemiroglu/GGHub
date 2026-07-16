import React, { useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { AppTopBar } from '@/src/components/shell';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { NotificationItem } from '@/src/components/notifications/NotificationItem';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { getNotifications, markAllNotificationsAsRead } from '@/src/api/notifications';
import { useAuth } from '@/src/hooks/use-auth';
import { AuthRequiredView } from '@/src/components/common/AuthRequiredView';
import { toMobileRoute } from '@/src/utils/route';
import { SignalRContext } from '@/src/contexts/signalr-context';
import type { NotificationDto } from '@/src/models/notification';
import { Spacing, FontSize } from '@/src/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const isFocused = useIsFocused();
  const nav = messages.nav;

  const { onReceiveNotification } = useContext(SignalRContext);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const unsub = onReceiveNotification(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return unsub;
  }, [onReceiveNotification, queryClient]);

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });

  const handleNotificationPress = useCallback(
    (notification: NotificationDto) => {
      if (notification.link) {
        router.push(toMobileRoute(notification.link) as any);
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationDto }) => (
      <NotificationItem
        notification={item}
        onPress={() => handleNotificationPress(item)}
      />
    ),
    [handleNotificationPress],
  );

  const hasUnread = (notificationsQuery.data ?? []).some((n) => !n.isRead);

  // Ekran her odaklandiginda (ve odaktayken yeni bildirim geldiginde) okunmamislari
  // otomatik okundu yap -> zil rozeti aninda temizlensin (X/Instagram tarzi).
  useEffect(() => {
    if (isFocused && hasUnread && !markAllMutation.isPending) {
      markAllMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, hasUnread]);

  if (!isAuthenticated) return <AuthRequiredView />;

  if (notificationsQuery.isLoading) return <LoadingScreen />;

  const MarkAllButton = hasUnread ? (
    <TouchableOpacity onPress={() => markAllMutation.mutate()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={[styles.markAllText, { color: colors.primary }]}>{nav.markAllRead}</Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <AppTopBar title={nav.notificationsTitle} rightExtra={MarkAllButton} showBack />

      <FlatList
        data={notificationsQuery.data ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => notificationsQuery.refetch()}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title={nav.noNotifications}
            description={messages.common.noResults}
          />
        }
        contentContainerStyle={[
          (notificationsQuery.data ?? []).length === 0 ? styles.emptyList : undefined,
          { paddingBottom: tabBarHeight + Spacing.md },
        ]}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  markAllText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyList: {
    flex: 1,
  },
});
