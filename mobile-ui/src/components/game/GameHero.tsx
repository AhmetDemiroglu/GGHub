import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { ScorePillRow } from '@/src/components/common/ScorePill';
import type { Game } from '@/src/models/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;

interface GameHeroProps {
  game: Game;
  /** scroll offset (Reanimated shared value) - parallax için */
  scrollY?: SharedValue<number>;
}

export function GameHero({ game, scrollY }: GameHeroProps) {
  const { colors } = useTheme();
  const imageUri = getImageUrl(game.backgroundImage);
  const releasedYear = game.released ? new Date(game.released).getFullYear() : undefined;

  // Parallax: image scroll ile yukarı taşınır + hafif scale
  const imageAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const y = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0, HERO_HEIGHT],
      [-HERO_HEIGHT / 2, 0, HERO_HEIGHT / 2],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0, HERO_HEIGHT],
      [1.3, 1, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: y }, { scale }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageWrap, imageAnimatedStyle]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.surfaceHighlight }]} />
        )}
      </Animated.View>

      {/* Real gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

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
    overflow: 'hidden',
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
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
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  releaseYear: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  scoreRow: {
    marginTop: Spacing.xs,
  },
});
