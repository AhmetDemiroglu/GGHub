import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import { formatTimeAgo } from '@/src/utils/format';
import { StarRating } from '@/src/components/common/StarRating';
import { MentionText } from '@/src/components/common/MentionText';
import { UserLinkAvatar, UserLinkName } from '@/src/components/common/UserLink';
import * as haptics from '@/src/utils/haptics';
import { voteReview } from '@/src/api/review';
import { applyReviewVote } from '@/src/utils/review-vote';
import type { Review } from '@/src/models/review';

interface ReviewCardProps {
  review: Review;
  gameId: number;
}

export function ReviewCard({ review, gameId }: ReviewCardProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: (value: number) => voteReview(review.id, { value }),
    // Iyimser guncelleme: skor ve dolu/bos ikon ANINDA degissin. Eskiden yalnizca
    // invalidate vardi; sunucu + yeniden cekme bitene kadar ekran tepkisizdi,
    // kullanici "tik yok" sanip tekrar basiyor ve toggle yuzunden oyu geri aliyordu.
    onMutate: async (value: number) => {
      await queryClient.cancelQueries({ queryKey: ['gameReviews', gameId] });
      const previous = queryClient.getQueryData<Review[]>(['gameReviews', gameId]);
      queryClient.setQueryData<Review[]>(['gameReviews', gameId], (old) =>
        old?.map((r) => (r.id === review.id ? applyReviewVote(r, value) : r)),
      );
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['gameReviews', gameId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gameReviews', gameId] });
    },
  });

  const handleVote = (value: number) => {
    // Istek ucustayken ikinci dokunusu yut: art arda iki dokunus backend'in
    // toggle'i yuzunden "oy ver + geri al" olup kullaniciyi sasirtiyordu.
    if (voteMutation.isPending) return;
    // Oyu geri cekmek icin AYNI degeri tekrar gonder; backend toggle ediyor
    // (ReviewService.VoteOnReviewAsync: existingVote.Value == value -> Remove).
    // Eskiden 0 gonderiliyordu, ReviewsController ise "Value != 1 && Value != -1"
    // ise 400 doner: yani mobilde inceleme oyunu geri cekmek hep hata veriyordu.
    haptics.impactLight();
    voteMutation.mutate(value);
  };

  const openComments = () => {
    haptics.impactLight();
    router.push(`/reviews/${review.id}`);
  };

  return (
    // Kartin TAMAMI inceleme detayina goturur (X deseni: gonderiye dokun, acilsin).
    // Icerideki Pressable'lar (oy, profil, Yorumlar) RN'de en derin hedef kazandigi
    // icin kendi dokunuslarini almaya devam eder.
    <Pressable
      onPress={openComments}
      style={[styles.container, { backgroundColor: colors.surface }, Shadows.sm]}
    >
      <View style={styles.header}>
        <UserLinkAvatar user={review.user} size={32} />
        <UserLinkName
          user={review.user}
          variant="username"
          containerStyle={styles.userInfo}
          style={[styles.username, { color: colors.text }]}
        >
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {formatTimeAgo(review.createdAt)}
          </Text>
        </UserLinkName>
        <StarRating rating={Math.round(review.rating / 2)} maxStars={5} size={14} />
      </View>

      {review.content ? (
        <MentionText
          body={review.content}
          style={[styles.reviewText, { color: colors.textSecondary }]}
          numberOfLines={6}
        />
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

        {/* Inceleme yorumlarina giris kapisi. Bu yoksa /reviews/{id} ekranina
            hicbir yerden ulasilamiyordu: ozellik mobilde tamamen erisilemezdi. */}
        <Pressable
          style={styles.commentButton}
          onPress={openComments}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={messages.commentsSection.open}
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.commentLabel, { color: colors.textMuted }]}>
            {messages.commentsSection.open}
          </Text>
        </Pressable>
      </View>
    </Pressable>
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
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: 'auto',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  commentLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
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
