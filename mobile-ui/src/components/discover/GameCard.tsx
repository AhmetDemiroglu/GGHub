import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { PlatformIcons } from '@/src/components/common/PlatformIcons';
import { ScoreBadge } from '@/src/components/common/ScoreBadge';
import type { Game } from '@/src/models/game';

interface GameCardProps {
  game: Game;
  variant?: 'compact' | 'list';
}

export function GameCard({ game, variant = 'compact' }: GameCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const imageUri = getImageUrl(game.coverImage ?? game.backgroundImage);

  const handlePress = () => {
    router.push(`/game/${game.slug}`);
  };

  if (variant === 'list') {
    return (
      <Pressable style={[styles.listCard, { backgroundColor: colors.surface }]} onPress={handlePress}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.listImage} resizeMode="cover" />
        ) : (
          <View style={[styles.listImage, { backgroundColor: colors.surfaceHighlight }]}>
            <Ionicons name="game-controller-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.listContent}>
          <Text style={[styles.listName, { color: colors.text }]} numberOfLines={2}>
            {game.name}
          </Text>
          <PlatformIcons platforms={game.platforms} size={14} maxIcons={4} />
          <View style={styles.listMeta}>
            {game.gghubRating != null && game.gghubRating > 0 && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.star} />
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {game.gghubRating.toFixed(1)}
                </Text>
              </View>
            )}
            {game.released && (
              <Text style={[styles.released, { color: colors.textMuted }]}>
                {new Date(game.released).getFullYear()}
              </Text>
            )}
          </View>
        </View>
        {game.metacritic != null && (
          <View style={styles.scoreBadgeContainer}>
            <ScoreBadge score={game.metacritic} size="sm" />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.compactCard, { backgroundColor: colors.surface }]} onPress={handlePress}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.compactImage} resizeMode="cover" />
      ) : (
        <View style={[styles.compactImage, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="game-controller-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.compactContent}>
        <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={2}>
          {game.name}
        </Text>
        <PlatformIcons platforms={game.platforms} size={12} maxIcons={3} />
        <View style={styles.compactMeta}>
          {game.gghubRating != null && game.gghubRating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={10} color={colors.star} />
              <Text style={[styles.compactRating, { color: colors.textSecondary }]}>
                {game.gghubRating.toFixed(1)}
              </Text>
            </View>
          )}
          {game.metacritic != null && (
            <ScoreBadge score={game.metacritic} size="sm" />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // List variant
  listCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  listImage: {
    width: 80,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  released: {
    fontSize: FontSize.xs,
  },
  scoreBadgeContainer: {
    alignSelf: 'center',
    marginRight: Spacing.md,
  },

  // Compact variant
  compactCard: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  compactImage: {
    width: '100%',
    height: 160,
  },
  compactContent: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  compactName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactRating: {
    fontSize: FontSize.xs,
  },

  // Shared
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FontSize.sm,
  },
});
