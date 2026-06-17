import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { ScorePillRow } from '@/src/components/common/ScorePill';
import type { Game } from '@/src/models/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

interface GameHeroProps {
  game: Game;
}

export function GameHero({ game }: GameHeroProps) {
  const { colors } = useTheme();
  const imageUri = getImageUrl(game.backgroundImage);
  const releasedYear = game.released ? new Date(game.released).getFullYear() : undefined;

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
        {releasedYear ? (
          <Text style={styles.releaseYear}>{releasedYear}</Text>
        ) : null}
        <View style={styles.scoreRow}>
          <ScorePillRow
            metacritic={game.metacritic}
            rawg={game.rating}
            gghub={game.gghubRating}
            gghubCount={game.gghubRatingCount}
            size="md"
            gap={8}
          />
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
    gap: Spacing.sm,
  },
  gameName: {
    color: '#ffffff',
    fontSize: FontSize.hero,
    fontWeight: '800',
  },
  releaseYear: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  scoreRow: {
    marginTop: Spacing.xs,
  },
});
