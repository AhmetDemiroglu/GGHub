import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Badge } from '@/src/components/common/Badge';
import { translateReportStatus, getReportStatusVariant, translateEntityType } from '@/src/utils/report';
import type { AdminReport } from '@/src/models/admin';

interface RecentReportsListProps {
  reports: AdminReport[];
}

const variantToColor: Record<string, { bg: string; text: string }> = {
  info: { bg: '#3b82f620', text: '#3b82f6' },
  success: { bg: '#22c55e20', text: '#22c55e' },
  danger: { bg: '#ef444420', text: '#ef4444' },
};

export function RecentReportsList({ reports }: RecentReportsListProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  if (reports.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>{m.noReports}</Text>
    );
  }

  return (
    <View>
      {reports.map((report) => {
        const variant = getReportStatusVariant(report.status);
        const badgeColor = variantToColor[variant] ?? variantToColor.info;
        return (
          <TouchableOpacity
            key={report.reportId}
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/(admin)/reports/${report.reportId}`)}
          >
            <View style={styles.row}>
              <Badge
                label={translateEntityType(report.entityType)}
                color={colors.primary}
              />
              <Text style={[styles.date, { color: colors.textMuted }]}>
                {new Date(report.reportedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.reason, { color: colors.text }]} numberOfLines={1}>
              {report.reason}
            </Text>
            <View style={styles.row}>
              <Text style={[styles.reporter, { color: colors.textSecondary }]}>
                {report.reporterUsername}
              </Text>
              <Badge
                label={translateReportStatus(report.status)}
                color={badgeColor.bg}
                textColor={badgeColor.text}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: FontSize.xs,
  },
  reason: {
    fontSize: FontSize.sm,
    marginBottom: 4,
  },
  reporter: {
    fontSize: FontSize.xs,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
