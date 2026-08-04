import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import type { DownloadAnalyticsFunnel } from '@/src/api/download-analytics';

interface DownloadFunnelCardProps {
  funnel: DownloadAnalyticsFunnel;
}

/**
 * /download-app hunisi. Web'deki DownloadFunnelCard'in mobil karsiligi: her
 * satir ziyaret sayisina gore oranli bir cubukla ciziliyor, boylece dar ekranda
 * da adimlar arasi dusus tek bakista okunuyor.
 */
export function DownloadFunnelCard({ funnel }: DownloadFunnelCardProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const d = messages.admin.downloadAnalytics;

  const rows: { label: string; value: number; color: string }[] = [
    { label: d.funnelVisits, value: funnel.visits, color: colors.primary },
    { label: d.funnelEligible, value: funnel.autoRedirectEligible, color: colors.info },
    { label: d.funnelReached, value: funnel.reachedStore, color: colors.success },
    { label: d.funnelManual, value: funnel.manualStoreClick, color: colors.success },
    { label: d.funnelCancelled, value: funnel.cancelled, color: colors.warning },
    { label: d.funnelWeb, value: funnel.webVersion, color: colors.info },
    { label: d.funnelNoAction, value: funnel.noAction, color: colors.textMuted },
  ];

  // Oran tabani ziyaret sayisi; sifira bolmeyi engellemek icin en az 1.
  const base = Math.max(funnel.visits, 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{d.funnelTitle}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{d.funnelDescription}</Text>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {row.label}
            </Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{row.value.toLocaleString()}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.surfaceHighlight }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: row.color,
                  width: `${Math.min(100, (row.value / base) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
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
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  row: {
    marginBottom: Spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  rowValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: BorderRadius.full,
  },
});
