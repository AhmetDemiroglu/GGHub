import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';
import { gameApi } from '@/src/api/game';
import { getGameReviews, getMyReview } from '@/src/api/review';
import { GameHero } from '@/src/components/game/GameHero';
import { GameInfo } from '@/src/components/game/GameInfo';
import { GameDescription } from '@/src/components/game/GameDescription';
import { ReviewCard } from '@/src/components/game/ReviewCard';
import { ReviewModal } from '@/src/components/game/ReviewModal';
import { AddToListModal } from '@/src/components/game/AddToListModal';
import { SimilarGames } from '@/src/components/game/SimilarGames';
import { WishlistButton } from '@/src/components/game/WishlistButton';
import { FavoriteButton } from '@/src/components/game/FavoriteButton';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';
import { useRequireAuth } from '@/src/contexts/auth-prompt-context';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import type { Game } from '@/src/models/game';

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const tabBarHeight = useTabBarHeight();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [listModalVisible, setListModalVisible] = useState(false);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const {
    data: game,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gameApi.getById(id!),
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['gameReviews', game?.id],
    queryFn: () => getGameReviews(game!.rawgId),
    enabled: !!game,
  });

  const { data: myReview } = useQuery({
    queryKey: ['myReview', game?.id],
    queryFn: () => getMyReview(game!.rawgId),
    enabled: !!game && isAuthenticated,
  });

  const { data: similarGames } = useQuery({
    queryKey: ['similarGames', game?.id],
    queryFn: () => gameApi.getSimilar(game!.id),
    enabled: !!game,
  });

  const syncMutation = useMutation({
    mutationFn: () => {
      return (gameApi as any).syncMetacritic
        ? (gameApi as any).syncMetacritic(game!.id)
        : Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', id] });
      haptics.success();
    },
    onError: () => {
      haptics.error();
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !game) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>
          {messages.common.genericError}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>{messages.common.back}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[styles.backButton, { top: insets.top + Spacing.sm }]}
        onPress={() => {
          haptics.impactLight();
          router.back();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <BlurView intensity={40} tint="dark" style={styles.backButtonBlur}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </BlurView>
      </Pressable>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <GameHero game={game} scrollY={scrollY} />

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {isAuthenticated && (
            <>
              <WishlistButton
                gameId={game.rawgId}
                isWishlisted={game.isInWishlist ?? false}
                size={22}
              />
              <FavoriteButton gameId={game.rawgId} size={22} />
            </>
          )}
          {isAuthenticated && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => requireAuth(() => {
                haptics.impactLight();
                setListModalVisible(true);
              })}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]} numberOfLines={1}>
                {messages.games.addToList}
              </Text>
            </Pressable>
          )}
          {isAuthenticated && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => requireAuth(() => {
                haptics.impactLight();
                setReviewModalVisible(true);
              })}
            >
              <Ionicons name="create-outline" size={18} color="#ffffff" />
              <Text style={[styles.actionText, { color: '#ffffff' }]} numberOfLines={1}>
                {myReview ? messages.games.editReview : messages.games.writeReview}
              </Text>
            </Pressable>
          )}
        </View>

        <GameInfo game={game} />

        <GameDescription game={game} />

        {/* Reviews section */}
        <View style={styles.reviewsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {messages.games.reviews}
          </Text>
          {reviews && reviews.length > 0 ? (
            reviews.map((review, index) => (
              <ReviewCard key={`${review.id}-${index}`} review={review} gameId={game.rawgId} />
            ))
          ) : (
            <View style={styles.noReviews}>
              <Ionicons name="chatbubble-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.noReviewsTitle, { color: colors.text }]}>
                {messages.games.noReviews}
              </Text>
              <Text style={[styles.noReviewsDesc, { color: colors.textMuted }]}>
                {messages.games.noReviewsDescription}
              </Text>
            </View>
          )}
        </View>

        {/* Similar games */}
        {similarGames && similarGames.length > 0 && (
          <SimilarGames games={similarGames} />
        )}

        {/* Admin: Sync Metacritic */}
        {user?.role === 'Admin' && (
          <View style={styles.adminSection}>
            <Pressable
              style={[styles.syncButton, { borderColor: colors.warning }]}
              onPress={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.warning} />
              ) : (
                <Ionicons name="sync" size={18} color={colors.warning} />
              )}
              <Text style={[styles.syncText, { color: colors.warning }]}>
                {messages.games.syncMetacritic}
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.ScrollView>

      {/* Modals */}
      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        gameId={game.rawgId}
        gameSlug={game.slug}
        existingReview={myReview}
      />

      <AddToListModal
        visible={listModalVisible}
        onClose={() => setListModalVisible(false)}
        gameId={game.rawgId}
      />

      <SwipeBackEdge />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  backText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  reviewsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  noReviewsTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  noReviewsDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  adminSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  syncText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
