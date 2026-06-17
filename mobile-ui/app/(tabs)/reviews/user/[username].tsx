import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getReviewsByUser } from '@/src/api/review';
import { getImageUrl } from '@/src/utils/image';
import type { Review } from '@/src/models/review';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function UserReviewsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const { user } = useAuth();

  const isSelf = username === 'me';
  const resolvedUsername = isSelf ? user?.username : username;

  const {
    data: reviews,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['userReviews', resolvedUsername],
    queryFn: () => getReviewsByUser(resolvedUsername!),
    enabled: !!resolvedUsername,
  });

  const headerTitle = isSelf
    ? messages.nav.screenTitles.myReviews
    : messages.nav.screenTitles.userReviews.replace('{username}', resolvedUsername ?? '');

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={colors.star}
          />
        ))}
      </View>
    );
  };

  const renderReview = useCallback(
    ({ item }: { item: Review }) => {
      const game = item.game;
      const imageUrl = game
        ? getImageUrl(game.coverImage ?? game.backgroundImage)
        : undefined;
      const dateStr = new Date(item.createdAt).toLocaleDateString();

      return (
        <Pressable
          style={[
            styles.reviewCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {
            if (game) {
              router.push(`/game/${game.slug}`);
            }
          }}
        >
          <View
            style={[
              styles.gameCover,
              { backgroundColor: colors.surfaceHighlight },
            ]}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.gameCoverImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name="game-controller-outline"
                size={24}
                color={colors.textMuted}
              />
            )}
          </View>
          <View style={styles.reviewContent}>
            <Text
              style={[styles.gameName, { color: colors.text }]}
              numberOfLines={1}
            >
              {game?.name ?? '-'}
            </Text>
            {renderStars(item.rating)}
            <Text
              style={[styles.reviewText, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {item.content}
            </Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {dateStr}
            </Text>
          </View>
        </Pressable>
      );
    },
    [colors, router],
  );

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={headerTitle} />
        <EmptyState
          icon="alert-circle-outline"
          title={messages.profileReviews.loadError}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={headerTitle} />
      <FlatList
        data={reviews ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderReview}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="chatbox-outline"
            title={messages.profileReviews.emptyTitle}
            description={messages.profileReviews.emptyDescription}
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
  },
  reviewCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  gameCover: {
    width: 90,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCoverImage: {
    width: 90,
    height: 120,
  },
  reviewContent: {
    flex: 1,
    padding: Spacing.md,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  reviewText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  dateText: {
    fontSize: FontSize.xs,
  },
});
