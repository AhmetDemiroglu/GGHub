import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius, Springs, Shadows } from '@/src/constants/theme';
import { formatNumber } from '@/src/utils/format';
import type { SiteStats } from '@/src/models/home';

interface StatsBarProps {
  stats: SiteStats;
}

/* Count-up hook: value'yu 0'dan hedefe animasyonlu olarak artırır */
function useCountUp(target: number, duration = 900, delay = 0) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const startTimer = setTimeout(() => {
      const step = (ts: number) => {
        if (start === null) start = ts;
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(startTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return display;
}

function StatItem({
  icon,
  value,
  label,
  color,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  delay: number;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const display = useCountUp(value, 900, delay);

  useEffect(() => {
    progress.value = withDelay(delay, withSpring(1, Springs.bouncy));
  }, [progress, delay]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.7, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.statItem,
        { backgroundColor: colors.surface },
        Shadows.sm,
        containerStyle,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {formatNumber(display)}
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
          delay={index * 120}
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
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.xs,
  },
});
