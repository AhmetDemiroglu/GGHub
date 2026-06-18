import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { useAuth } from '@/src/hooks/use-auth';
import { useRequireAuth } from '@/src/contexts/auth-prompt-context';
import { Spacing, BorderRadius, Springs, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';
import { toggleFavorite, checkFavoriteStatus } from '@/src/api/list';

interface FavoriteButtonProps {
  gameId: number; // rawgId bekleniyor
  size?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FavoriteButton({ gameId, size = 24 }: FavoriteButtonProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['favoriteStatus', gameId],
    queryFn: () => checkFavoriteStatus(gameId),
    enabled: isAuthenticated,
  });

  const [localFavorite, setLocalFavorite] = useState(false);
  useEffect(() => {
    if (status) setLocalFavorite(status.isFavorite);
  }, [status]);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const mutation = useMutation({
    mutationFn: () => toggleFavorite(gameId),
    onSuccess: (data) => {
      setLocalFavorite(data.isAdded);
      queryClient.setQueryData(['favoriteStatus', gameId], { isFavorite: data.isAdded });
      queryClient.invalidateQueries({ queryKey: ['myFavorites'] });
      if (data.isAdded) {
        haptics.success();
      } else {
        haptics.impactLight();
      }
      showToast('success', data.message);
    },
    onError: (err: any) => {
      // Favori limiti (5) gibi durumlarda backend BadRequest + message doner.
      const msg = err?.response?.data?.message ?? messages.common.genericError;
      showToast('error', msg);
    },
  });

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
        {
          backgroundColor: localFavorite ? `${colors.star}15` : colors.surface,
          borderWidth: 1,
          borderColor: localFavorite ? `${colors.star}55` : colors.border,
        },
        Shadows.sm,
        animStyle,
      ]}
      onPress={handlePress}
      disabled={mutation.isPending}
      accessibilityLabel={
        localFavorite ? messages.favoriteButton.removeTitle : messages.favoriteButton.addTitle
      }
    >
      <Ionicons
        name={localFavorite ? 'star' : 'star-outline'}
        size={size}
        color={localFavorite ? colors.star : colors.textSecondary}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
  },
});
