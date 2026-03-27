import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, BorderRadius, Spacing } from '@/src/constants/theme';

interface BadgeProps {
  count?: number;
  label?: string;
  variant?: 'default' | 'primary' | 'error' | 'success' | 'danger' | 'warning' | 'info';
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
}

export function Badge({ count, label, variant = 'error', size = 'sm', color, textColor }: BadgeProps) {
  const { colors } = useTheme();

  const variantBgColor = {
    default: colors.surface,
    primary: colors.primary,
    error: colors.badge,
    success: colors.success,
    danger: colors.error,
    warning: colors.warning,
    info: colors.primary,
  }[variant];

  const bgColor = color ?? variantBgColor;

  const text = label ?? (count !== undefined ? (count > 99 ? '99+' : String(count)) : '');
  if (!text && count === undefined) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          minWidth: size === 'sm' ? 18 : 22,
          height: size === 'sm' ? 18 : 22,
          paddingHorizontal: size === 'sm' ? 4 : 6,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size === 'sm' ? 10 : 12, color: textColor ?? '#ffffff' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
