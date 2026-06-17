import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius, Springs } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const bgColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surface
        : variant === 'danger'
          ? colors.error
          : variant === 'outline'
            ? 'transparent'
            : 'transparent';

  const txtColor =
    variant === 'primary' || variant === 'danger'
      ? '#ffffff'
      : variant === 'secondary'
        ? colors.text
        : variant === 'outline'
          ? colors.primary
          : colors.primary;

  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  const paddingVertical = size === 'sm' ? 6 : size === 'lg' ? 14 : 10;
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 24 : 16;
  const fontSize = size === 'sm' ? FontSize.sm : size === 'lg' ? FontSize.lg : FontSize.md;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, Springs.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Springs.bouncy);
  };
  const handlePress = () => {
    if (variant === 'danger') haptics.impactMedium();
    else haptics.impactLight();
    onPress();
  };

  return (
    <AnimatedPressable
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled || loading ? 0.6 : 1,
        },
        variant === 'outline' && styles.outline,
        fullWidth && { width: '100%' as const },
        style,
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={txtColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: txtColor, fontSize }, textStyle]}>{title}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  outline: {
    borderWidth: 1.5,
  },
  text: {
    fontWeight: '600',
  },
});
