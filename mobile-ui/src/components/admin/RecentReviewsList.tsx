import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize } from '@/src/constants/theme';
import { Avatar } from '@/src/components/common/Avatar';
import type { RecentReview } from '@/src/models/admin';

interface RecentReviewsListProps {
  reviews: RecentReview[];
}

export function RecentReviewsList({ reviews }: RecentReviewsListProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.admin;

  if (reviews.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>{m.noReviews}</Text>
    );
  }

  return (
    <View>
      {reviews.map((review) => (
        <View
          key={review.id}
          style={[styles.item, { borderBottomColor: colors.border }]}
        >
          <Avatar uri={review.userProfileImageUrl} name={review.username} size={36} />
          <View style={styles.info}>
            <Text style={[styles.username, { color: colors.text }]}>{review.username}</Text>
            <Text style={[styles.game, { color: colors.textSecondary }]} numberOfLines={1}>
              {review.gameName}
            </Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={colors.star} />
            <Text style={[styles.rating, { color: colors.text }]}>{review.rating}</Text>
          </View>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  game: {
    fontSize: FontSize.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  date: {
    fontSize: FontSize.xs,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
