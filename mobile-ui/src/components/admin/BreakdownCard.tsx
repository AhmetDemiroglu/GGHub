import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import type { DownloadAnalyticsBreakdown } from '@/src/api/download-analytics';

interface BreakdownCardProps {
  title: string;
  description?: string;
  rows: DownloadAnalyticsBreakdown[];
}

/**
 * Tek boyutun (kanal, kampanya, platform, ulke, tarayici) kirilimi.
 * Dar ekranda tablo yerine satir listesi: anahtar ustte, sayilar altta.
 */
export function BreakdownCard({ title, description, rows }: BreakdownCardProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const d = messages.admin.downloadAnalytics;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{description}</Text>
      ) : null}

      {rows.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{d.noData}</Text>
      ) : (
        rows.map((row) => (
          <View key={row.key} style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rowKey, { color: colors.text }]} numberOfLines={1}>
              {row.key}
            </Text>
            <View style={styles.metrics}>
              <Text style={[styles.metric, { color: colors.textSecondary }]}>
                {d.colVisits}: {row.uniqueVisits.toLocaleString()}
              </Text>
              <Text style={[styles.metric, { color: colors.textSecondary }]}>
                {d.colReach}: {row.storeReach.toLocaleString()}
              </Text>
              <Text style={[styles.metric, { color: colors.primary, fontWeight: '600' }]}>
                {row.conversionRate}%
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  row: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowKey: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: 2,
  },
  metric: {
    fontSize: FontSize.xs,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
