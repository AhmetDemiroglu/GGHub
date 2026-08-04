import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import type { DownloadAnalyticsTimePoint } from '@/src/api/download-analytics';

interface DownloadTrendChartProps {
  data: DownloadAnalyticsTimePoint[];
  locale: string;
}

/**
 * Gunluk egilim. Grafik kutuphanesi EKLENMEDI: iki serili (tekil ziyaret ve
 * magazaya ulasma) basit bir sutun grafigi View'lerle cizilebiliyor ve mobil
 * pakete yeni bir bagimlilik girmiyor.
 */
export function DownloadTrendChart({ data, locale }: DownloadTrendChartProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const d = messages.admin.downloadAnalytics;

  // Cok uzun araliklarda (90 gun) sutunlar okunamayacak kadar incelir; son 30
  // gun gosteriliyor, ozet kartlari zaten tum araligi kapsiyor.
  const points = data.slice(-30);
  const peak = Math.max(1, ...points.map((p) => Math.max(p.uniqueVisits, p.storeReach)));

  const formatDay = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{d.trendTitle}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{d.trendDescription}</Text>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{d.uniqueVisits}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{d.storeReach}</Text>
        </View>
      </View>

      {points.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{d.noData}</Text>
      ) : (
        <>
          <View style={styles.chart}>
            {points.map((point) => (
              <View key={point.date} style={styles.column}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.primary,
                      height: Math.max(2, (point.uniqueVisits / peak) * 100),
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.success,
                      height: Math.max(2, (point.storeReach / peak) * 100),
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.axis}>
            <Text style={[styles.axisLabel, { color: colors.textMuted }]}>
              {formatDay(points[0].date)}
            </Text>
            <Text style={[styles.axisLabel, { color: colors.textMuted }]}>
              {formatDay(points[points.length - 1].date)}
            </Text>
          </View>
        </>
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
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: FontSize.xs,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 108,
    gap: 3,
    marginTop: Spacing.md,
  },
  column: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  axisLabel: {
    fontSize: FontSize.xs,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
