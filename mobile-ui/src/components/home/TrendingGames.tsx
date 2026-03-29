import React, { useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import type { HomeGame } from '@/src/models/home';

interface TrendingGamesProps {
  games: HomeGame[];
}

const CARD_WIDTH = 140;
const CARD_HEIGHT = 200;

export function TrendingGames({ games }: TrendingGamesProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();

  const renderItem = useCallback(
    ({ item }: { item: HomeGame }) => {
      const imageUri = getImageUrl(item.backgroundImage);

      return (
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface }]}
          onPress={() => router.push(`/game/${item.slug}`)}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, { backgroundColor: colors.surfaceHighlight }]} />
          )}
          <View style={styles.cardContent}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            {item.gghubRating > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.star} />
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {item.gghubRating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      );
    },
    [colors, router],
  );

  if (!games.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {messages.home.trendingTitle}
        </Text>
        <Pressable onPress={() => router.push('/discover')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>
            {messages.home.seeAll}
          </Text>
        </Pressable>
      </View>
      <FlatList
        data={games}
        renderItem={renderItem}
        keyExtractor={(item) => `trend-${item.rawgId}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT * 0.65,
  },
  cardContent: {
    padding: Spacing.sm,
    gap: 4,
  },
  cardName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FontSize.xs,
  },
});
