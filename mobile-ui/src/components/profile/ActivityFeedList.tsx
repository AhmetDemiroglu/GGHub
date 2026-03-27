import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/common/Avatar';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { ActivityType, type Activity } from '@/src/models/activity';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface ActivityFeedListProps {
  activities: Activity[];
}

const ACTIVITY_ICONS: Record<number, keyof typeof Ionicons.glyphMap> = {
  [ActivityType.Review]: 'chatbubble-ellipses-outline',
  [ActivityType.ListCreated]: 'list-outline',
  [ActivityType.FollowUser]: 'person-add-outline',
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

export function ActivityFeedList({ activities }: ActivityFeedListProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  if (!activities || activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {messages.profile.activityFeed.noActivity}
        </Text>
      </View>
    );
  }

  const getDescription = (item: Activity): string => {
    switch (item.type) {
      case ActivityType.Review:
        return messages.profile.activityFeed.reviewText;
      case ActivityType.ListCreated:
        return messages.profile.activityFeed.listText;
      case ActivityType.FollowUser:
        return messages.profile.activityFeed.followText;
      default:
        return '';
    }
  };

  const getTargetName = (item: Activity): string | undefined => {
    switch (item.type) {
      case ActivityType.Review:
        return item.reviewData?.game?.name;
      case ActivityType.ListCreated:
        return item.listData?.name;
      case ActivityType.FollowUser:
        return item.followData?.username;
      default:
        return undefined;
    }
  };

  const renderItem = ({ item }: { item: Activity }) => {
    const iconName = ACTIVITY_ICONS[item.type] || 'ellipse-outline';
    const description = getDescription(item);
    const targetName = getTargetName(item);

    return (
      <View style={[styles.activityRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceHighlight }]}>
          <Ionicons name={iconName} size={18} color={colors.primary} />
        </View>
        <View style={styles.activityContent}>
          <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={2}>
            {description}
          </Text>
          {targetName ? (
            <Text style={[styles.targetName, { color: colors.primary }]} numberOfLines={1}>
              {targetName}
            </Text>
          ) : null}
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatTimeAgo(item.occurredAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{messages.home.recentActivity}</Text>
      {activities.map((item, index) => (
        <View key={`${item.id}-${item.type}-${index}`}>{renderItem({ item })}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  targetName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  timeText: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
  },
});
