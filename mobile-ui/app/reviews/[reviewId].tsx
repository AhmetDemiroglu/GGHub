import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { StarRating } from '@/src/components/common/StarRating';
import { MentionText } from '@/src/components/common/MentionText';
import { UserLinkAvatar, UserLinkName } from '@/src/components/common/UserLink';
import { ReviewCommentSection } from '@/src/components/reviews/ReviewCommentSection';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getReviewById } from '@/src/api/review';
import { getImageUrl } from '@/src/utils/image';
import { formatTimeAgo } from '@/src/utils/format';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

/**
 * Bir incelemenin kalici linki. Bildirimler buraya "/reviews/{id}" ile gelir
 * (yorum/yanit/begeni/bahis olaylari).
 *
 * Not: expo-router'da statik segment dinamik segmenti yener; bu yuzden
 * "reviews/user/[username]" ekrani "/reviews/user/x" icin cozulmeye devam eder,
 * bu dosya yalnizca "/reviews/123" gibi tek segmentli yollari yakalar.
 */
export default function ReviewDetailScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const numericId = Number(reviewId);
  const t = messages.reviewDetail;

  const {
    data: review,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['review', numericId],
    queryFn: () => getReviewById(numericId),
    enabled: Number.isFinite(numericId),
  });

  if (isLoading) return <LoadingScreen />;

  if (isError || !review) {
    return (
      <ScreenWrapper noPadding safeArea={false} swipeBackEnabled={false}>
        <ScreenHeader title={messages.nav.screenTitles.reviewDetail} />
        <EmptyState icon="alert-circle-outline" title={t.notFound} />
      </ScreenWrapper>
    );
  }

  const game = review.game;
  const gameImage = game ? getImageUrl(game.coverImage ?? game.backgroundImage) : undefined;

  return (
    <ScreenWrapper noPadding safeArea={false} swipeBackEnabled={false}>
      <ScreenHeader title={messages.nav.screenTitles.reviewDetail} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}>
        <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <UserLinkAvatar user={review.user} size={40} />
            <UserLinkName
              user={review.user}
              containerStyle={styles.userInfo}
              style={[styles.username, { color: colors.text }]}
            >
              <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                {formatTimeAgo(review.createdAt)}
              </Text>
            </UserLinkName>
            <StarRating rating={Math.round(review.rating / 2)} maxStars={5} size={16} />
          </View>

          {game ? (
            <Pressable
              style={[styles.gameRow, { borderColor: colors.border }]}
              onPress={() => router.push(`/game/${game.slug}`)}
            >
              <View style={[styles.gameCover, { backgroundColor: colors.surfaceHighlight }]}>
                {gameImage ? (
                  <Image source={{ uri: gameImage }} style={styles.gameCoverImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="game-controller-outline" size={20} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.gameInfo}>
                <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={2}>
                  {game.name}
                </Text>
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                  {t.ratingValue.replace('{rating}', String(review.rating))}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {review.content ? (
            <MentionText
              body={review.content}
              style={[styles.reviewText, { color: colors.textSecondary }]}
            />
          ) : null}

          <View style={styles.voteRow}>
            <Ionicons name="thumbs-up-outline" size={14} color={colors.textMuted} />
            <Text
              style={[
                styles.voteScore,
                {
                  color:
                    review.voteScore > 0
                      ? colors.success
                      : review.voteScore < 0
                        ? colors.error
                        : colors.textMuted,
                },
              ]}
            >
              {review.voteScore}
            </Text>
          </View>
        </View>

        <ReviewCommentSection reviewId={numericId} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  reviewCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: FontSize.xs,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gameCover: {
    width: 44,
    height: 58,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameCoverImage: {
    width: 44,
    height: 58,
  },
  gameInfo: {
    flex: 1,
    gap: 2,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  ratingText: {
    fontSize: FontSize.xs,
  },
  reviewText: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  voteScore: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
