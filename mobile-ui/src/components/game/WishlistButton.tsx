import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { useRequireAuth } from '@/src/contexts/auth-prompt-context';
import { Spacing, BorderRadius, Springs, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';
import { toggleWishlist } from '@/src/api/list';

interface WishlistButtonProps {
  gameId: number;
  isWishlisted: boolean;
  gameSlug: string;
  size?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WishlistButton({ gameId, isWishlisted, gameSlug, size = 24 }: WishlistButtonProps) {
  const { colors } = useTheme();
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();
  const [localWishlisted, setLocalWishlisted] = useState(isWishlisted);

  const scale = useSharedValue(1);
  const heartPop = useSharedValue(localWishlisted ? 1 : 0);

  const mutation = useMutation({
    mutationFn: () => toggleWishlist(gameId),
    onMutate: () => {
      const next = !localWishlisted;
      setLocalWishlisted(next);
      // heart pop animation + haptics
      if (next) {
        haptics.success();
        heartPop.value = withSequence(
          withTiming(0, { duration: 0 }),
          withSpring(1.2, Springs.bouncy),
          withSpring(1, Springs.smooth),
        );
      } else {
        haptics.impactLight();
        heartPop.value = withSpring(0, Springs.smooth);
      }
    },
    onSuccess: (data) => {
      setLocalWishlisted(data.isAdded);
      queryClient.invalidateQueries({ queryKey: ['game', gameSlug] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      setLocalWishlisted(isWishlisted);
      heartPop.value = withSpring(isWishlisted ? 1 : 0, Springs.smooth);
    },
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartPop.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, Springs.snappy),
      withSpring(1, Springs.bouncy),
    );
    requireAuth(() => mutation.mutate());
  };

  return (
    <AnimatedPressable
      style={[
        styles.button,
        { backgroundColor: localWishlisted ? `${colors.error}15` : colors.surface },
        Shadows.sm,
        buttonAnimatedStyle,
      ]}
      onPress={handlePress}
      disabled={mutation.isPending}
    >
      <Animated.View style={heartAnimatedStyle}>
        <Ionicons
          name={localWishlisted ? 'heart' : 'heart-outline'}
          size={size}
          color={localWishlisted ? colors.error : colors.textMuted}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
  },
});
