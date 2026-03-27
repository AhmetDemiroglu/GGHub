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
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { NotificationItem } from '@/src/components/notifications/NotificationItem';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getNotifications, markAllNotificationsAsRead } from '@/src/api/notifications';
import { SignalRContext } from '@/src/contexts/signalr-context';
import type { NotificationDto } from '@/src/models/notification';
import { Spacing, FontSize } from '@/src/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const queryClient = useQueryClient();
  const nav = messages.nav;

  const { onReceiveNotification } = useContext(SignalRContext);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
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
    },
  });

  const handleNotificationPress = useCallback(
    (notification: NotificationDto) => {
      if (notification.link) {
        router.push(notification.link as any);
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

  if (notificationsQuery.isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper noPadding>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{nav.notificationsTitle}</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={() => markAllMutation.mutate()}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>{messages.common.done}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
        contentContainerStyle={
          (notificationsQuery.data ?? []).length === 0 ? styles.emptyList : undefined
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  markAllText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyList: {
    flex: 1,
  },
});
