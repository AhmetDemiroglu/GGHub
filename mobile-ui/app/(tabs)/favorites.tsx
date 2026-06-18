import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { getFavoritesList, toggleFavorite } from '@/src/api/list';
import { getImageUrl } from '@/src/utils/image';
import type { ListGamePreview } from '@/src/models/list';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const username = user?.username ?? '';

  const {
    data: favorites,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['myFavorites', username],
    queryFn: () => getFavoritesList(username),
    enabled: isAuthenticated && !!username,
  });

  const removeMutation = useMutation({
    mutationFn: (rawgId: number) => toggleFavorite(rawgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
      showToast('success', messages.favoritesPage.removeSuccess);
    },
    onError: () => {
      showToast('error', messages.favoritesPage.removeError);
    },
  });

  const renderGame = useCallback(
    ({ item }: { item: ListGamePreview }) => {
      const imageUrl = getImageUrl(item.coverImage);
      return (
        <Pressable
          style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/game/${item.slug}`)}
        >
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
          </View>
          <Pressable
            style={[styles.removeButton, { backgroundColor: colors.error + '15' }]}
            onPress={() => removeMutation.mutate(item.rawgId)}
            accessibilityLabel={messages.favoritesPage.removeAria}
          >
            <Ionicons name="close" size={20} color={colors.error} />
          </Pressable>
        </Pressable>
      );
    },
    [colors, messages, removeMutation, router],
  );

  const games = favorites?.previewGames ?? [];

  if (!isAuthenticated) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={messages.nav.screenTitles.favorites} />
        <EmptyState
          icon="lock-closed-outline"
          title={messages.favoritesPage.loginRequired}
          description={messages.favoritesPage.loginDescription}
        />
      </ScreenWrapper>
    );
  }

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={messages.nav.screenTitles.favorites} />
        <EmptyState icon="alert-circle-outline" title={messages.favoritesPage.loadError} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.nav.screenTitles.favorites} />
      <FlatList
        data={games}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGame}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + Spacing.md }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {messages.favoritesPage.description}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title={messages.favoritesPage.emptyTitle}
            description={messages.favoritesPage.emptyDescription}
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
