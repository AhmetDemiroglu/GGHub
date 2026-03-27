import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/format';
import type { SiteStats } from '@/src/models/home';

interface StatsBarProps {
  stats: SiteStats;
}

interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  delay: number;
}

function StatItem({ icon, value, label, color, delay }: StatItemProps) {
  const { colors } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      delay,
      useNativeDriver: true,
    }).start();
  }, [animValue, delay]);

  return (
    <Animated.View
      style={[
        styles.statItem,
        { backgroundColor: colors.surface, opacity: animValue, transform: [{ scale: animValue }] },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: colors.text }]}>
        {formatNumber(value)}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

export function StatsBar({ stats }: StatsBarProps) {
  const { messages } = useLocale();

  const items = [
    { icon: 'game-controller' as const, value: stats.totalGames, label: messages.home.stats.games, color: '#6366f1' },
    { icon: 'people' as const, value: stats.totalUsers, label: messages.home.stats.users, color: '#22c55e' },
    { icon: 'chatbubble-ellipses' as const, value: stats.totalReviews, label: messages.home.stats.reviews, color: '#f59e0b' },
    { icon: 'list' as const, value: stats.totalLists, label: messages.home.stats.lists, color: '#3b82f6' },
  ];

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <StatItem
          key={item.label}
          icon={item.icon}
          value={item.value}
          label={item.label}
          color={item.color}
          delay={index * 100}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.xs,
  },
});
