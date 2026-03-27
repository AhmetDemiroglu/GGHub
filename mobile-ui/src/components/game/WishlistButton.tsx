import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, BorderRadius } from '@/src/constants/theme';
import { toggleWishlist } from '@/src/api/list';

interface WishlistButtonProps {
  gameId: number;
  isWishlisted: boolean;
  gameSlug: string;
  size?: number;
}

export function WishlistButton({ gameId, isWishlisted, gameSlug, size = 24 }: WishlistButtonProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [localWishlisted, setLocalWishlisted] = useState(isWishlisted);

  const mutation = useMutation({
    mutationFn: () => toggleWishlist(gameId),
    onMutate: () => {
      setLocalWishlisted((prev) => !prev);
    },
    onSuccess: (data) => {
      setLocalWishlisted(data.isAdded);
      queryClient.invalidateQueries({ queryKey: ['game', gameSlug] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      setLocalWishlisted(isWishlisted);
    },
  });

  return (
    <Pressable
      style={[styles.button, { backgroundColor: localWishlisted ? `${colors.error}15` : colors.surface }]}
      onPress={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <Ionicons
        name={localWishlisted ? 'heart' : 'heart-outline'}
        size={size}
        color={localWishlisted ? colors.error : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
  },
});
