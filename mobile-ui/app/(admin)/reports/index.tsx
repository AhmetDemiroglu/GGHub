import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Input } from '@/src/components/common/Input';
import { Badge } from '@/src/components/common/Badge';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { getReports } from '@/src/api/admin';
import { ReportStatus } from '@/src/models/report';
import { translateReportStatus, getReportStatusVariant, translateEntityType } from '@/src/utils/report';
import { APP_CONFIG } from '@/src/constants/config';
import type { AdminReport, ReportFilterParams } from '@/src/models/admin';

const variantToColor: Record<string, { bg: string; text: string }> = {
  info: { bg: '#3b82f620', text: '#3b82f6' },
  success: { bg: '#22c55e20', text: '#22c55e' },
  danger: { bg: '#ef444420', text: '#ef4444' },
};

export default function AdminReportsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = APP_CONFIG.paginationDefaults.adminPageSize;

  const params: ReportFilterParams = {
    page,
    pageSize,
    searchTerm: searchTerm || undefined,
    statusFilter,
    entityTypeFilter: typeFilter,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'reports', params],
    queryFn: () => getReports(params).then((res) => res.data),
  });

  const reports = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = page * pageSize < totalCount;

  const statusFilters: { key: ReportStatus | undefined; label: string }[] = [
    { key: undefined, label: m.statusAll },
    { key: ReportStatus.Open, label: m.statusOpen },
    { key: ReportStatus.Resolved, label: m.statusResolved },
    { key: ReportStatus.Ignored, label: m.statusIgnored },
  ];

  const typeFilters: { key: string | undefined; label: string }[] = [
    { key: undefined, label: m.statusAll },
    { key: 'Review', label: m.entityTypes.review },
    { key: 'Comment', label: m.entityTypes.comment },
    { key: 'List', label: m.entityTypes.list },
    { key: 'User', label: m.entityTypes.user },
  ];

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isFetching]);

  const renderReport = useCallback(
    ({ item }: { item: AdminReport }) => {
      const variant = getReportStatusVariant(item.status);
      const badgeColor = variantToColor[variant] ?? variantToColor.info;
      return (
        <TouchableOpacity
          style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/(admin)/reports/${item.reportId}`)}
        >
          <View style={styles.reportTop}>
            <Badge label={translateEntityType(item.entityType)} color={colors.primary} />
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {new Date(item.reportedAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.reporter, { color: colors.textSecondary }]}>
            {item.reporterUsername}
          </Text>
          <Text style={[styles.reason, { color: colors.text }]} numberOfLines={2}>
            {item.reason}
          </Text>
          <Badge
            label={translateReportStatus(item.status)}
            color={badgeColor.bg}
            textColor={badgeColor.text}
          />
        </TouchableOpacity>
      );
    },
    [colors, router, m],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Input
          placeholder={messages.common.search}
          value={searchTerm}
          onChangeText={(text) => {
            setSearchTerm(text);
            setPage(1);
          }}
          autoCapitalize="none"
        />
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{m.tableStatus}</Text>
        <View style={styles.filters}>
          {statusFilters.map((f, i) => (
            <TouchableOpacity
              key={`status-${i}`}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === f.key ? colors.primary : colors.surface,
                  borderColor: statusFilter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === f.key ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filters}>
          {typeFilters.map((f, i) => (
            <TouchableOpacity
              key={`type-${i}`}
              style={[
                styles.filterChip,
                {
                  backgroundColor: typeFilter === f.key ? colors.primary : colors.surface,
                  borderColor: typeFilter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                setTypeFilter(f.key);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: typeFilter === f.key ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : reports.length === 0 ? (
        <EmptyState icon="flag-outline" title={m.noReports} />
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => String(item.reportId)}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reportCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  reportTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reporter: {
    fontSize: FontSize.sm,
  },
  reason: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  date: {
    fontSize: FontSize.xs,
  },
});
