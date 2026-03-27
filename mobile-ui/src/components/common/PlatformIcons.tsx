import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing } from '@/src/constants/theme';
import type { Platform } from '@/src/models/game';

interface PlatformIconsProps {
  platforms: Platform[];
  size?: number;
  color?: string;
  maxIcons?: number;
}

function getPlatformIcon(slug: string): keyof typeof Ionicons.glyphMap {
  const s = slug.toLowerCase();
  if (s.includes('pc') || s.includes('windows')) return 'desktop-outline';
  if (s.includes('playstation') || s.includes('ps')) return 'logo-playstation';
  if (s.includes('xbox')) return 'logo-xbox';
  if (s.includes('nintendo') || s.includes('switch')) return 'game-controller-outline';
  if (s.includes('ios') || s.includes('iphone')) return 'logo-apple';
  if (s.includes('android')) return 'logo-android';
  if (s.includes('mac') || s.includes('macos')) return 'laptop-outline';
  if (s.includes('linux')) return 'logo-tux';
  if (s.includes('web')) return 'globe-outline';
  return 'game-controller-outline';
}

function getUniquePlatformIcons(platforms: Platform[]): { slug: string; icon: keyof typeof Ionicons.glyphMap }[] {
  const seen = new Set<string>();
  const result: { slug: string; icon: keyof typeof Ionicons.glyphMap }[] = [];

  for (const p of platforms) {
    const icon = getPlatformIcon(p.slug);
    if (!seen.has(icon as string)) {
      seen.add(icon as string);
      result.push({ slug: p.slug, icon });
    }
  }

  return result;
}

export function PlatformIcons({ platforms, size = 16, color, maxIcons = 5 }: PlatformIconsProps) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.textSecondary;
  const uniqueIcons = getUniquePlatformIcons(platforms).slice(0, maxIcons);

  return (
    <View style={styles.container}>
      {uniqueIcons.map((item) => (
        <Ionicons key={item.slug} name={item.icon} size={size} color={iconColor} />
      ))}
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
