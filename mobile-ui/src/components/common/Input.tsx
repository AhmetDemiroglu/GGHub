import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius, Springs } from '@/src/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({ label, error, icon, style, onFocus, onBlur, secureTextEntry, ...props }: InputProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = !!secureTextEntry;
  const useRow = !!icon || isPassword;

  // Focus border color animation
  const borderProgress = useSharedValue(0);
  // Shake on error
  const shakeX = useSharedValue(0);

  React.useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shakeX]);

  const handleFocus = (e: any) => {
    setFocused(true);
    borderProgress.value = withSpring(1, Springs.snappy);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    borderProgress.value = withSpring(0, Springs.snappy);
    onBlur?.(e);
  };

  const containerShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const borderAnimStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.error
      : interpolateColor(
          borderProgress.value,
          [0, 1],
          [colors.inputBorder, colors.primary],
        ),
  }));

  return (
    <Animated.View style={[styles.container, containerShakeStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      <Animated.View
        style={[
          useRow ? styles.inputRow : styles.inputRowNoIcon,
          { backgroundColor: colors.inputBackground },
          borderAnimStyle,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon as any}
            size={20}
            color={focused ? colors.primary : colors.placeholder}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            useRow && { flex: 1, marginBottom: 0 },
            props.multiline && { textAlignVertical: 'top' as const },
            style,
          ]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? messages.common.hidePassword : messages.common.showPassword
            }
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.placeholder}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputRowNoIcon: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  error: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  eyeBtn: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
});
