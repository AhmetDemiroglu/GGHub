import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing } from '@/src/constants/theme';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const { colors } = useTheme();

  const handlePress = (star: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(star === rating ? 0 : star);
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, index) => {
        const starNumber = index + 1;
        const filled = starNumber <= rating;
        const halfFilled = !filled && starNumber - 0.5 <= rating;

        return (
          <Pressable
            key={index}
            onPress={() => handlePress(starNumber)}
            disabled={!interactive}
            hitSlop={4}
          >
            <Ionicons
              name={filled ? 'star' : halfFilled ? 'star-half' : 'star-outline'}
              size={size}
              color={filled || halfFilled ? colors.star : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
