import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { formatTimeAgo } from '@/src/utils/format';
import { ActivityType, type Activity } from '@/src/models/activity';

interface ActivityFeedProps {
  activities: Activity[];
}

function ActivityItem({ item }: { item: Activity }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();

  const getActivityInfo = () => {
    switch (item.type) {
      case ActivityType.Review: {
        const gameName = item.reviewData?.game?.name ?? '';
        return {
          icon: 'chatbubble-ellipses' as const,
          iconColor: '#f59e0b',
          text: `${messages.home.reviewShared} ${gameName}`,
          onPress: () => {
            if (item.reviewData?.game?.slug) {
              router.push(`/game/${item.reviewData.game.slug}`);
            }
          },
          image: getImageUrl(item.reviewData?.game?.coverImage ?? item.reviewData?.game?.backgroundImage),
          rating: item.reviewData?.rating,
        };
      }
      case ActivityType.ListCreated: {
        const listName = item.listData?.name ?? '';
        return {
          icon: 'list' as const,
          iconColor: '#3b82f6',
          text: `${messages.home.listCreated}: ${listName}`,
          onPress: () => {
            if (item.listData?.listId) {
              router.push(`/lists/${item.listData.listId}`);
            }
          },
          image: item.listData?.previewImages?.[0] ? getImageUrl(item.listData.previewImages[0]) : null,
        };
      }
      case ActivityType.FollowUser: {
        const username = item.followData?.username ?? '';
        return {
          icon: 'person-add' as const,
          iconColor: '#22c55e',
          text: `${messages.home.startedFollowing} @${username}`,
          onPress: () => {
            if (username) {
              router.push(`/profile/${username}`);
            }
          },
          image: getImageUrl(item.followData?.profileImageUrl),
        };
      }
      default:
        return {
          icon: 'ellipse' as const,
          iconColor: colors.textMuted,
          text: '',
          onPress: () => {},
          image: null,
        };
    }
  };

  const info = getActivityInfo();
  if (!info.text) return null;

  return (
    <Pressable style={[styles.activityItem, { backgroundColor: colors.surface }]} onPress={info.onPress}>
      <View style={[styles.iconCircle, { backgroundColor: `${info.iconColor}20` }]}>
        <Ionicons name={info.icon} size={18} color={info.iconColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={2}>
          {info.text}
        </Text>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>
          {formatTimeAgo(item.occurredAt)}
        </Text>
        {info.rating != null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.star} />
            <Text style={[styles.ratingValue, { color: colors.star }]}>{info.rating}/10</Text>
          </View>
        )}
      </View>
      {info.image && (
        <Image source={{ uri: info.image }} style={styles.activityImage} resizeMode="cover" />
      )}
    </Pressable>
  );
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  if (!activities.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {messages.home.emptyFeed}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {messages.home.recentActivity}
      </Text>
      {activities.map((item, index) => (
        <ActivityItem key={`${item.id}-${index}`} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  activityText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  timeText: {
    fontSize: FontSize.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingValue: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  activityImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  emptyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
