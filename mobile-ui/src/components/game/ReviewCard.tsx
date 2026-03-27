import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { formatTimeAgo } from '@/src/utils/format';
import { StarRating } from '@/src/components/common/StarRating';
import { voteReview } from '@/src/api/review';
import type { Review } from '@/src/models/review';

interface ReviewCardProps {
  review: Review;
  gameId: number;
}

export function ReviewCard({ review, gameId }: ReviewCardProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const avatarUri = getImageUrl(review.user.profileImageUrl);

  const voteMutation = useMutation({
    mutationFn: (value: number) => voteReview(review.id, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameReviews', gameId] });
    },
  });

  const handleVote = (value: number) => {
    if (review.currentUserVote === value) {
      voteMutation.mutate(0);
    } else {
      voteMutation.mutate(value);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={14} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]}>{review.user.username}</Text>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {formatTimeAgo(review.createdAt)}
          </Text>
        </View>
        <StarRating rating={Math.round(review.rating / 2)} maxStars={5} size={14} />
      </View>

      {review.content ? (
        <Text style={[styles.reviewText, { color: colors.textSecondary }]} numberOfLines={6}>
          {review.content}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          style={[styles.voteButton, review.currentUserVote === 1 && { backgroundColor: `${colors.success}20` }]}
          onPress={() => handleVote(1)}
        >
          <Ionicons
            name={review.currentUserVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={review.currentUserVote === 1 ? colors.success : colors.textMuted}
          />
        </Pressable>
        <Text style={[styles.voteScore, { color: review.voteScore > 0 ? colors.success : review.voteScore < 0 ? colors.error : colors.textMuted }]}>
          {review.voteScore}
        </Text>
        <Pressable
          style={[styles.voteButton, review.currentUserVote === -1 && { backgroundColor: `${colors.error}20` }]}
          onPress={() => handleVote(-1)}
        >
          <Ionicons
            name={review.currentUserVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
            size={16}
            color={review.currentUserVote === -1 ? colors.error : colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: FontSize.xs,
  },
  reviewText: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voteButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  voteScore: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
});
