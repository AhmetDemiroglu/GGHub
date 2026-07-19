import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { MentionText } from '@/src/components/common/MentionText';

export default function UserReviewsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const isSelf = username === 'me';
  const resolvedUsername = isSelf ? user?.username : username;

  const {
    data: reviews,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['userReviews', resolvedUsername],
    queryFn: () => getReviewsByUser(resolvedUsername!),
    enabled: !!resolvedUsername,
  });

  const headerTitle = isSelf
    ? messages.nav.screenTitles.myReviews
    : messages.nav.screenTitles.userReviews.replace('{username}', resolvedUsername ?? '');

  // Puanlar 10 üzerinden; 5 yıldıza ölçeklenir (8/10 -> 4 yıldız) ve sayısal
  // "x/10" etiketi eklenir. Eskiden 10'luk puan ham basılıyordu: 5+ olan her
  // puan 5 yıldız doluyordu ve inceleme detayıyla çelişiyordu.
  const renderStars = (rating: number) => {
    const filled = Math.round(rating / 2);
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= filled ? 'star' : 'star-outline'}
            size={14}
            color={colors.star}
          />
        ))}
        <Text style={[styles.ratingValue, { color: colors.star }]}>{rating}/10</Text>
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
        // Kartın tamamı inceleme detayına götürür (X deseni); kapağa dokunmak
        // oyun sayfasına gider (iç Pressable derin hedef olarak kazanır).
        <Pressable
          style={[
            styles.reviewCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push(`/reviews/${item.id}`)}
        >
          <Pressable
            style={[
              styles.gameCover,
              { backgroundColor: colors.surfaceHighlight },
            ]}
            onPress={() => {
              if (game) router.push(`/game/${game.slug}`);
            }}
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
          </Pressable>
          <View style={styles.reviewContent}>
            <Text
              style={[styles.gameName, { color: colors.text }]}
              numberOfLines={1}
            >
              {game?.name ?? '-'}
            </Text>
            {renderStars(item.rating)}
            {/* Kartin tamami dokunulabilir; bahis burada yalnizca boyanir, link DEGIL. */}
            <MentionText
              body={item.content}
              style={[styles.reviewText, { color: colors.textSecondary }]}
              numberOfLines={3}
              linkify={false}
            />
            {/* X tarzı göstergeler: beğeni + yorum + tarih */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons
                  name={(item.likeCount ?? 0) > 0 ? 'heart' : 'heart-outline'}
                  size={14}
                  color={(item.likeCount ?? 0) > 0 ? colors.error : colors.textMuted}
                />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{item.likeCount ?? 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{item.commentCount ?? 0}</Text>
              </View>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
            </View>
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
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.md }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
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
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  ratingValue: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.xs,
  },
  dateText: {
    fontSize: FontSize.xs,
  },
});
