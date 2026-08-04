import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface StatsCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Sayi binlik ayraciyla bicimlenir; hazir metin (ör. "%12,5") oldugu gibi basilir. */
  value: number | string;
  color: string;
  /** Deger altina kucuk aciklama satiri (kampanya analitigi kartlarinda kullaniliyor). */
  description?: string;
}

export function StatsCard({ icon, label, value, color, description }: StatsCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: 2,
  },
});
