import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius, Springs } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { PlatformIcons } from '@/src/components/common/PlatformIcons';
import { ScorePillRow } from '@/src/components/common/ScorePill';
import * as haptics from '@/src/utils/haptics';
import type { Game } from '@/src/models/game';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GameCardProps {
  game: Game;
  variant?: 'compact' | 'list';
}

export function GameCard({ game, variant = 'compact' }: GameCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const imageUri = getImageUrl(game.coverImage ?? game.backgroundImage);
  const releasedYear = game.released ? new Date(game.released).getFullYear() : undefined;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    haptics.impactLight();
    router.push(`/game/${game.slug}`);
  };
  const handlePressIn = () => {
    scale.value = withSpring(0.97, Springs.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Springs.bouncy);
  };

  if (variant === 'list') {
    return (
      <AnimatedPressable
        style={[styles.listCard, { backgroundColor: colors.surface }, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.listImage} resizeMode="cover" />
        ) : (
          <View style={[styles.listImage, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="game-controller-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.listContent}>
          <Text style={[styles.listName, { color: colors.text }]} numberOfLines={2}>
            {game.name}
          </Text>
          <View style={styles.subRow}>
            <PlatformIcons platforms={game.platforms} size={14} maxIcons={4} />
            {releasedYear ? (
              <Text style={[styles.released, { color: colors.textMuted }]}>{releasedYear}</Text>
            ) : null}
          </View>
          <ScorePillRow
            metacritic={game.metacritic}
            rawg={game.rating}
            gghub={game.gghubRating}
            gghubCount={game.gghubRatingCount}
            size="sm"
            gap={5}
          />
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.compactCard, { backgroundColor: colors.surface }, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
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
        <ScorePillRow
          metacritic={game.metacritic}
          rawg={game.rating}
          gghub={game.gghubRating}
          gghubCount={game.gghubRatingCount}
          size="sm"
          gap={5}
        />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  listImage: {
    width: 80,
    height: 110,
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
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  released: {
    fontSize: FontSize.xs,
  },
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
});
