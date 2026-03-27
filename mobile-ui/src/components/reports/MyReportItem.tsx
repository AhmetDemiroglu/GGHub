import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Badge } from '@/src/components/common/Badge';
import { Button } from '@/src/components/common/Button';
import { translateReportStatus, getReportStatusVariant, translateEntityType } from '@/src/utils/report';
import { ReportStatus } from '@/src/models/report';
import type { MyReportSummary } from '@/src/models/report';

interface MyReportItemProps {
  report: MyReportSummary;
  onViewResult: (report: MyReportSummary) => void;
}

const variantToColor: Record<string, { bg: string; text: string }> = {
  info: { bg: '#3b82f620', text: '#3b82f6' },
  success: { bg: '#22c55e20', text: '#22c55e' },
  danger: { bg: '#ef444420', text: '#ef4444' },
};

export function MyReportItem({ report, onViewResult }: MyReportItemProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.report;

  const variant = getReportStatusVariant(report.status);
  const badgeColor = variantToColor[variant] ?? variantToColor.info;
  const showViewResult = report.status !== ReportStatus.Open;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Badge
          label={translateEntityType(report.entityType)}
          color={colors.primary}
        />
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {new Date(report.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.reason, { color: colors.text }]} numberOfLines={2}>
        {report.reason}
      </Text>
      <View style={styles.bottomRow}>
        <Badge
          label={translateReportStatus(report.status)}
          color={badgeColor.bg}
          textColor={badgeColor.text}
        />
        {showViewResult ? (
          <Button
            title={m.viewResult}
            onPress={() => onViewResult(report)}
            variant="ghost"
            size="sm"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: FontSize.xs,
  },
  reason: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
