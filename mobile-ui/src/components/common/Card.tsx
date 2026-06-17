import React from 'react';
import { StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, BorderRadius, Springs, Shadows } from '@/src/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
  /** press'te hafif lift efekti */
  pressable?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, style, onPress, noPadding, pressable = true }: CardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: 0.12 + lift.value * 0.04,
    elevation: 4 + lift.value * 4,
  }));

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        style={[cardStyle, pressable && animatedStyle]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, Springs.snappy);
          lift.value = withSpring(1, Springs.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Springs.bouncy);
          lift.value = withSpring(0, Springs.snappy);
        }}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <Animated.View style={cardStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  noPadding: {
    padding: 0,
  },
});
