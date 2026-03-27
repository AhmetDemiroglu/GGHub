import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { ScoreBadge } from '@/src/components/common/ScoreBadge';
import type { Game } from '@/src/models/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;

interface GameHeroProps {
  game: Game;
}

export function GameHero({ game }: GameHeroProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const imageUri = getImageUrl(game.backgroundImage);

  return (
    <View style={styles.container}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, { backgroundColor: colors.surfaceHighlight }]} />
      )}
      <View style={styles.gradient} />
      <View style={styles.overlay}>
        <Text style={styles.gameName} numberOfLines={3}>
          {game.name}
        </Text>
        <View style={styles.ratingsRow}>
          {game.metacritic != null && (
            <View style={styles.ratingItem}>
              <ScoreBadge score={game.metacritic} size="md" label={messages.games.metacriticScore} />
            </View>
          )}
          {game.gghubRating != null && game.gghubRating > 0 && (
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>{messages.games.gghubRating}</Text>
              <View style={styles.gghubBadge}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.gghubValue}>{game.gghubRating.toFixed(1)}</Text>
              </View>
              {game.gghubRatingCount != null && game.gghubRatingCount > 0 && (
                <Text style={styles.ratingCount}>({game.gghubRatingCount})</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  gameName: {
    color: '#ffffff',
    fontSize: FontSize.hero,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xl,
  },
  ratingItem: {
    alignItems: 'center',
    gap: 4,
  },
  ratingLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.xs,
  },
  gghubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  gghubValue: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  ratingCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.xs,
  },
});
