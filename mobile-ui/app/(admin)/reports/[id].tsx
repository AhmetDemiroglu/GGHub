import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Badge } from '@/src/components/common/Badge';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { Avatar } from '@/src/components/common/Avatar';
import { Card } from '@/src/components/common/Card';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { getReportDetail, respondToReport } from '@/src/api/admin';
import { ReportStatus } from '@/src/models/report';
import { translateReportStatus, getReportStatusVariant, translateEntityType } from '@/src/utils/report';

const variantToColor: Record<string, { bg: string; text: string }> = {
  info: { bg: '#3b82f620', text: '#3b82f6' },
  success: { bg: '#22c55e20', text: '#22c55e' },
  danger: { bg: '#ef444420', text: '#ef4444' },
};

export default function AdminReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = Number(id);
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const m = messages.admin;

  const [response, setResponse] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin', 'report-detail', reportId],
    queryFn: () => getReportDetail(reportId).then((res) => res.data),
    enabled: !!reportId,
  });

  const respondMutation = useMutation({
    mutationFn: () => respondToReport(reportId, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setResponse('');
    },
  });

  if (isLoading || !report) {
    return <LoadingScreen />;
  }

  const variant = getReportStatusVariant(report.status);
  const badgeColor = variantToColor[variant] ?? variantToColor.info;
  const isResolved = report.status !== ReportStatus.Open;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Badge
            label={translateReportStatus(report.status)}
            color={badgeColor.bg}
            textColor={badgeColor.text}
          />
          <Badge
            label={translateEntityType(report.entityType)}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {m.reportDate}: {new Date(report.reportedAt).toLocaleDateString()}
        </Text>
      </View>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.reason}</Text>
        <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
          {report.reason}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.reportedContent}</Text>
        <Text style={[styles.entityTitle, { color: colors.text }]}>
          {report.reportedEntityTitle}
        </Text>
        <Text style={[styles.entityContent, { color: colors.textSecondary }]}>
          {report.reportedContent}
        </Text>
      </Card>

      <View style={styles.infoCardsRow}>
        <Card style={styles.infoCard}>
          <Text style={[styles.infoCardTitle, { color: colors.textMuted }]}>{m.contentOwner}</Text>
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => router.push(`/(admin)/users/${report.accusedUserId}`)}
          >
            <Avatar uri={report.accusedProfileImage} name={report.accusedUsername} size={32} />
            <Text style={[styles.infoUsername, { color: colors.text }]}>
              {report.accusedUsername}
            </Text>
          </TouchableOpacity>
        </Card>
        <Card style={styles.infoCard}>
          <Text style={[styles.infoCardTitle, { color: colors.textMuted }]}>{m.reporter}</Text>
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => router.push(`/(admin)/users/${report.reporterId}`)}
          >
            <Avatar uri={report.reporterProfileImage} name={report.reporterUsername} size={32} />
            <Text style={[styles.infoUsername, { color: colors.text }]}>
              {report.reporterUsername}
            </Text>
          </TouchableOpacity>
        </Card>
      </View>

      {isResolved ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.adminResponse}</Text>
          <Text style={[styles.responseText, { color: colors.textSecondary }]}>
            {report.adminResponse}
          </Text>
          {report.resolvedAt ? (
            <Text style={[styles.resolvedDate, { color: colors.textMuted }]}>
              {m.resolvedAt}: {new Date(report.resolvedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.adminResponse}</Text>
          <Input
            placeholder={m.responsePlaceholder}
            value={response}
            onChangeText={setResponse}
            multiline
            numberOfLines={4}
            style={styles.responseInput}
          />
          <Button
            title={m.respondAndClose}
            onPress={() => respondMutation.mutate()}
            variant="primary"
            loading={respondMutation.isPending}
            disabled={response.length < 5}
            icon={<Ionicons name="checkmark-circle" size={18} color="#ffffff" />}
          />
        </Card>
      )}

      <Button
        title={m.goToUserManagement}
        onPress={() => router.push(`/(admin)/users/${report.accusedUserId}`)}
        variant="outline"
        icon={<Ionicons name="person" size={18} color={colors.primary} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headerCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateLabel: {
    fontSize: FontSize.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  reasonText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  entityTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  entityContent: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoCard: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoUsername: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  responseText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  resolvedDate: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  responseInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
});
