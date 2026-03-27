import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { NotificationType, type NotificationDto } from '@/src/models/notification';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface NotificationItemProps {
  notification: NotificationDto;
  onPress: () => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  [NotificationType.Follow]: 'person-add-outline',
  [NotificationType.ListFollow]: 'list-outline',
  [NotificationType.Message]: 'chatbubble-outline',
  [NotificationType.Review]: 'chatbubble-ellipses-outline',
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  [NotificationType.Follow]: '#6366f1',
  [NotificationType.ListFollow]: '#8b5cf6',
  [NotificationType.Message]: '#3b82f6',
  [NotificationType.Review]: '#22c55e',
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 30) return `${diffDay}d`;
  return date.toLocaleDateString();
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { colors } = useTheme();
  const iconName = NOTIFICATION_ICONS[notification.type] || 'notifications-outline';
  const iconColor = NOTIFICATION_COLORS[notification.type] || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: notification.isRead ? 'transparent' : colors.surfaceHighlight,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrapper, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text
          style={[
            styles.message,
            { color: colors.text, fontWeight: notification.isRead ? '400' : '600' },
          ]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatTimeAgo(notification.createdAt)}
        </Text>
      </View>
      {!notification.isRead ? (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  time: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
