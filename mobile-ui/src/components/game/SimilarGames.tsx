import React, { useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import type { Game } from '@/src/models/game';

interface SimilarGamesProps {
  games: Game[];
}

const CARD_WIDTH = 120;

export function SimilarGames({ games }: SimilarGamesProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();

  const renderItem = useCallback(
    ({ item }: { item: Game }) => {
      const imageUri = getImageUrl(item.coverImage ?? item.backgroundImage);

      return (
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface }]}
          onPress={() => router.push(`/game/${item.slug}`)}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="game-controller-outline" size={24} color={colors.textMuted} />
            </View>
          )}
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
        </Pressable>
      );
    },
    [colors, router],
  );

  if (!games.length) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {messages.games.similarGames}
      </Text>
      <FlatList
        data={games}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
    height: CARD_WIDTH * 1.3,
  },
  cardName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    padding: Spacing.sm,
    lineHeight: 16,
  },
});
