import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
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

const LOGOS = {
  rawg: require('@/assets/images/rawg_logo.png'),
  metacritic: require('@/assets/images/metacritic_logo.png'),
  gghub: require('@/assets/images/gghub_logo.png'),
} as const;

// Web `list-game-card.tsx` ile birebir uyum:
// bg-{tone}-500/10  text-{tone}-400  border-{tone}-500/20
const PALETTE = {
  rawg:       { bg: 'rgba(59,130,246,0.10)', fg: '#60a5fa', border: 'rgba(59,130,246,0.20)' },
  metacritic: { bg: 'rgba(34,197,94,0.10)',  fg: '#4ade80', border: 'rgba(34,197,94,0.20)' },
  gghub:      { bg: 'rgba(168,85,247,0.10)', fg: '#c084fc', border: 'rgba(168,85,247,0.20)' },
} as const;

const SIZE_MAP = {
  sm: { height: 22, fontSize: FontSize.xs, paddingX: 7, iconSize: 11, gap: 5, countFontSize: 9 },
  md: { height: 28, fontSize: FontSize.sm, paddingX: 9, iconSize: 14, gap: 6, countFontSize: 10 },
  lg: { height: 34, fontSize: FontSize.md, paddingX: 11, iconSize: 17, gap: 7, countFontSize: 11 },
} as const;

function formatValue(type: ScoreType, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return DASH;
  if (type === 'metacritic') return String(Math.round(value));
  return value.toFixed(1);
}

export function ScorePill({ type, value, count, size = 'sm' }: ScorePillProps) {
  const dims = SIZE_MAP[size];
  const palette = PALETTE[type];
  const isEmpty = value == null || Number.isNaN(value);
  const fg = isEmpty ? '#9aa0a6' : palette.fg;
  const bg = isEmpty ? 'rgba(120,120,120,0.14)' : palette.bg;
  const border = isEmpty ? 'rgba(120,120,120,0.22)' : palette.border;

  return (
    <View
      style={[
        styles.pill,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingX,
          backgroundColor: bg,
          borderColor: border,
          gap: dims.gap,
        },
      ]}
    >
      <Image
        source={LOGOS[type]}
        style={{
          width: dims.iconSize,
          height: dims.iconSize,
          opacity: isEmpty ? 0.5 : 0.95,
        }}
        resizeMode="contain"
      />
      <Text style={[styles.value, { color: fg, fontSize: dims.fontSize }]}>
        {formatValue(type, value)}
      </Text>
      {type === 'gghub' && count != null && count > 0 ? (
        <Text style={[styles.count, { color: fg, fontSize: dims.countFontSize }]}>({count})</Text>
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

export function ScorePillRow({
  metacritic,
  rawg,
  gghub,
  gghubCount,
  size = 'sm',
  gap = 6,
}: ScorePillRowProps) {
  return (
    <View style={[styles.row, { gap }]}>
      <ScorePill type="rawg" value={rawg} size={size} />
      <ScorePill type="metacritic" value={metacritic} size={size} />
      <ScorePill type="gghub" value={gghub} count={gghubCount} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  count: {
    opacity: 0.85,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
