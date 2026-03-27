import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, BorderRadius, Spacing } from '@/src/constants/theme';

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function ScoreBadge({ score, size = 'md', label }: ScoreBadgeProps) {
  const { colors } = useTheme();

  if (score == null) return null;

  const sizeMap = {
    sm: { width: 28, height: 28, fontSize: FontSize.xs },
    md: { width: 36, height: 36, fontSize: FontSize.sm },
    lg: { width: 48, height: 48, fontSize: FontSize.lg },
  };

  const { width, height, fontSize } = sizeMap[size];
  const bgColor = getScoreColor(score);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: FontSize.xs }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.badge, { width, height, backgroundColor: bgColor }]}>
        <Text style={[styles.score, { fontSize }]}>{Math.round(score)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 2,
  },
  badge: {
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: '#ffffff',
    fontWeight: '700',
  },
  label: {
    marginBottom: Spacing.xs,
  },
});
