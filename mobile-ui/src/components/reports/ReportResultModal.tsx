import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { Button } from '@/src/components/common/Button';
import type { MyReportSummary } from '@/src/models/report';

interface ReportResultModalProps {
  visible: boolean;
  onClose: () => void;
  report: MyReportSummary | null;
}

export function ReportResultModal({ visible, onClose, report }: ReportResultModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.report;

  if (!report) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={m.reportResult}>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{m.yourReason}</Text>
        <Text style={[styles.text, { color: colors.text }]}>{report.reason}</Text>
      </View>

      {report.adminResponse ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{m.adminResponse}</Text>
          <View style={[styles.responseBox, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.text, { color: colors.text }]}>{report.adminResponse}</Text>
          </View>
        </View>
      ) : null}

      {report.resolvedAt ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{m.resolvedAt}</Text>
          <Text style={[styles.text, { color: colors.text }]}>
            {new Date(report.resolvedAt).toLocaleDateString()}
          </Text>
        </View>
      ) : null}

      <Button
        title={messages.common.close}
        onPress={onClose}
        variant="secondary"
        style={styles.closeButton}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  text: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  responseBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  closeButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
