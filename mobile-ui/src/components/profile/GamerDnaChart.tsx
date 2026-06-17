import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface GenreStat {
  name: string;
  percentage: number;
  color?: string;
}

interface GamerDnaChartProps {
  data: GenreStat[];
  username?: string;
}

// Radar geometrisi (viewBox koordinatlari; Svg responsive olarak olceklenir)
const VB_W = 300;
const VB_H = 270;
const CX = VB_W / 2;
const CY = VB_H / 2;
const MAX_R = 82;
const LABEL_R = MAX_R + 16;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1];

export function GamerDnaChart({ data, username }: GamerDnaChartProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { showToast } = useToast();
  const g = messages.profile.gamerDna;

  const Header = (
    <View style={styles.headerRow}>
      <View style={styles.titleWrap}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="pulse" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{g.title}</Text>
      </View>
      {data && data.length >= 3 ? (
        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={g.shareButtonTitle}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  function handleShare() {
    const displayName = username || g.defaultUserName;
    const url = username ? `https://gghub.social/profiles/${username}` : 'https://gghub.social';
    const text = g.shareText.replace('{displayName}', displayName).replace('{url}', url);
    Clipboard.setStringAsync(text);
    showToast('success', g.shareSuccess);
  }

  if (!data || data.length < 3) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {Header}
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{g.noData}</Text>
        </View>
      </View>
    );
  }

  const n = data.length;
  const angleAt = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pointAt = (i: number, r: number) => ({
    x: CX + r * Math.cos(angleAt(i)),
    y: CY + r * Math.sin(angleAt(i)),
  });
  const toPoints = (r: (i: number) => number) =>
    data.map((_, i) => {
      const p = pointAt(i, r(i));
      return `${p.x},${p.y}`;
    }).join(' ');

  const dataPolygon = toPoints((i) => (Math.min(Math.max(data[i].percentage, 0), 100) / 100) * MAX_R);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {Header}

      <View style={styles.chartWrap}>
        <Svg width="100%" height={230} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {/* Grid: esmerkezli poligonlar */}
          {GRID_LEVELS.map((lvl) => (
            <Polygon
              key={`grid-${lvl}`}
              points={toPoints(() => lvl * MAX_R)}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}

          {/* Eksen cizgileri (spokes) */}
          {data.map((_, i) => {
            const outer = pointAt(i, MAX_R);
            return (
              <Line
                key={`spoke-${i}`}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke={colors.border}
                strokeWidth={1}
              />
            );
          })}

          {/* Veri poligonu */}
          <Polygon
            points={dataPolygon}
            fill={colors.primary + '59'}
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />

          {/* Veri noktalari */}
          {data.map((d, i) => {
            const p = pointAt(i, (Math.min(Math.max(d.percentage, 0), 100) / 100) * MAX_R);
            return <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3} fill={colors.primary} />;
          })}

          {/* Eksen etiketleri */}
          {data.map((d, i) => {
            const p = pointAt(i, LABEL_R);
            const anchor =
              Math.abs(p.x - CX) < 1 ? 'middle' : p.x > CX ? 'start' : 'end';
            return (
              <G key={`label-${i}`}>
                <SvgText
                  x={p.x}
                  y={p.y}
                  fill={colors.textMuted}
                  fontSize={10}
                  fontWeight="700"
                  textAnchor={anchor}
                  alignmentBaseline="middle"
                >
                  {d.name.toUpperCase()}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  chartWrap: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
