import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getMyWishlist, toggleWishlist } from '@/src/api/list';
import { getImageUrl } from '@/src/utils/image';
import type { Game } from '@/src/models/game';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function WishlistScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: wishlist,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['myWishlist'],
    queryFn: () => getMyWishlist(),
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (gameId: number) => toggleWishlist(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myWishlist'] });
      showToast('success', messages.wishlistPage.removeSuccess);
    },
    onError: () => {
      showToast('error', messages.wishlistPage.removeError);
    },
  });

  const games = wishlist?.games ?? [];

  if (!isAuthenticated) {
    return (
      <ScreenWrapper>
        <EmptyState
          icon="lock-closed-outline"
          title={messages.wishlistPage.loginRequired}
          description={messages.wishlistPage.loginDescription}
        />
      </ScreenWrapper>
    );
  }

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <ScreenWrapper>
        <EmptyState icon="alert-circle-outline" title={messages.wishlistPage.loadError} />
      </ScreenWrapper>
    );
  }

  const renderGame = useCallback(
    ({ item }: { item: Game }) => {
      const imageUrl = getImageUrl(item.coverImage ?? item.backgroundImage);
      return (
        <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.gameCover, { backgroundColor: colors.surfaceHighlight }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.gameCoverImage} resizeMode="cover" />
            ) : (
              <Ionicons name="game-controller-outline" size={28} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.gameInfo}>
            <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.gghubRating != null && item.gghubRating > 0 ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.star} />
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {item.gghubRating.toFixed(1)} {messages.wishlistPage.gghubRating}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
            onPress={() => removeMutation.mutate(item.id)}
            accessibilityLabel={messages.wishlistPage.removeAria}
          >
            <Ionicons name="close" size={20} color={colors.error} />
          </Pressable>
        </View>
      );
    },
    [colors, messages, removeMutation],
  );

  return (
    <ScreenWrapper>
      <FlatList
        data={games}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGame}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {messages.wishlistPage.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {messages.wishlistPage.description}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title={messages.wishlistPage.emptyTitle}
            description={messages.wishlistPage.emptyDescription}
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
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  gameCover: {
    width: 80,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCoverImage: {
    width: 80,
    height: 100,
  },
  gameInfo: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FontSize.sm,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
});
