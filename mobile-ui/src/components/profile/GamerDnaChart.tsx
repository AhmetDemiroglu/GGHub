import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface GenrePreference {
  genre: string;
  percentage: number;
}

interface GamerDnaChartProps {
  data: GenrePreference[];
}

const BAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#a855f7',
];

export function GamerDnaChart({ data }: GamerDnaChartProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {messages.profile.gamerDna.noData}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{messages.profile.gamerDna.title}</Text>
      {data.map((item, index) => (
        <View key={item.genre} style={styles.row}>
          <Text style={[styles.genreLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.genre}
          </Text>
          <View style={styles.barContainer}>
            <View style={[styles.barBg, { backgroundColor: colors.surfaceHighlight }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    width: `${Math.min(item.percentage, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Text style={[styles.percentText, { color: colors.textMuted }]}>
            {Math.round(item.percentage)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  genreLabel: {
    width: 80,
    fontSize: FontSize.sm,
  },
  barContainer: {
    flex: 1,
  },
  barBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentText: {
    width: 36,
    fontSize: FontSize.sm,
    textAlign: 'right',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
  },
});
