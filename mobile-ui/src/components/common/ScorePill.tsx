import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, BorderRadius } from '@/src/constants/theme';

export type ScoreType = 'metacritic' | 'rawg' | 'gghub';
export type ScoreSize = 'sm' | 'md' | 'lg';

interface ScorePillProps {
  type: ScoreType;
  value: number | null | undefined;
  count?: number | null;
  size?: ScoreSize;
}

const DASH = '-';

function formatValue(type: ScoreType, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  if (type === 'metacritic') return String(Math.round(value));
  return value.toFixed(1);
}

function metacriticColor(score: number | null | undefined): { bg: string; fg: string } {
  if (score == null) return { bg: 'rgba(120,120,120,0.18)', fg: '#9aa0a6' };
  if (score >= 75) return { bg: 'rgba(76,175,80,0.18)', fg: '#4caf50' };
  if (score >= 50) return { bg: 'rgba(255,193,7,0.18)', fg: '#ffc107' };
  return { bg: 'rgba(244,67,54,0.18)', fg: '#f44336' };
}

const SIZE_MAP = {
  sm: { height: 22, fontSize: FontSize.xs, paddingX: 6, iconSize: 11, labelFontSize: 9, gap: 3 },
  md: { height: 28, fontSize: FontSize.sm, paddingX: 8, iconSize: 13, labelFontSize: 10, gap: 4 },
  lg: { height: 34, fontSize: FontSize.md, paddingX: 10, iconSize: 16, labelFontSize: 11, gap: 5 },
} as const;

export function ScorePill({ type, value, count, size = 'sm' }: ScorePillProps) {
  const { colors } = useTheme();
  const dims = SIZE_MAP[size];
  const formatted = formatValue(type, value);

  if (type === 'metacritic') {
    const c = metacriticColor(value);
    return (
      <View
        style={[
          styles.pill,
          {
            height: dims.height,
            paddingHorizontal: dims.paddingX,
            backgroundColor: c.bg,
            gap: dims.gap,
          },
        ]}
      >
        <Text style={[styles.label, { color: c.fg, fontSize: dims.labelFontSize }]}>MC</Text>
        <Text style={[styles.value, { color: c.fg, fontSize: dims.fontSize }]}>{formatted}</Text>
      </View>
    );
  }

  if (type === 'rawg') {
    const fg = value == null ? '#9aa0a6' : '#60a5fa';
    const bg = value == null ? 'rgba(120,120,120,0.18)' : 'rgba(96,165,250,0.18)';
    return (
      <View
        style={[
          styles.pill,
          { height: dims.height, paddingHorizontal: dims.paddingX, backgroundColor: bg, gap: dims.gap },
        ]}
      >
        <Text style={[styles.label, { color: fg, fontSize: dims.labelFontSize }]}>RAWG</Text>
        <Text style={[styles.value, { color: fg, fontSize: dims.fontSize }]}>{formatted}</Text>
      </View>
    );
  }

  // gghub
  const fg = value == null ? '#9aa0a6' : '#c084fc';
  const bg = value == null ? 'rgba(120,120,120,0.18)' : 'rgba(192,132,252,0.18)';
  return (
    <View
      style={[
        styles.pill,
        { height: dims.height, paddingHorizontal: dims.paddingX, backgroundColor: bg, gap: dims.gap },
      ]}
    >
      <Ionicons name="star" size={dims.iconSize} color={value == null ? '#9aa0a6' : '#fbbf24'} />
      <Text style={[styles.value, { color: fg, fontSize: dims.fontSize }]}>{formatted}</Text>
      {count != null && count > 0 ? (
        <Text style={[styles.count, { color: fg, fontSize: dims.labelFontSize }]}>({count})</Text>
      ) : null}
    </View>
  );
}

interface ScorePillRowProps {
  metacritic?: number | null;
  rawg?: number | null;
  gghub?: number | null;
  gghubCount?: number | null;
  size?: ScoreSize;
  gap?: number;
}

export function ScorePillRow({ metacritic, rawg, gghub, gghubCount, size = 'sm', gap = 6 }: ScorePillRowProps) {
  return (
    <View style={[styles.row, { gap }]}>
      <ScorePill type="metacritic" value={metacritic} size={size} />
      <ScorePill type="rawg" value={rawg} size={size} />
      <ScorePill type="gghub" value={gghub} count={gghubCount} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  value: {
    fontWeight: '700',
  },
  count: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
