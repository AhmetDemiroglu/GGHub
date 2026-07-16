import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { Spacing } from '@/src/constants/theme';
import { AuthGuard } from '@/src/components/common/AuthGuard';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { MyReportItem } from '@/src/components/reports/MyReportItem';
import { ReportResultModal } from '@/src/components/reports/ReportResultModal';
import { getMyReports } from '@/src/api/report';
import { ScreenHeader } from '@/src/components/shell';
import type { MyReportSummary } from '@/src/models/report';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';

export default function MyReportsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const tabBarHeight = useTabBarHeight();
  const m = messages.report;

  const [selectedReport, setSelectedReport] = useState<MyReportSummary | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: reports, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => getMyReports().then((res) => res.data),
  });

  const handleViewResult = useCallback((report: MyReportSummary) => {
    setSelectedReport(report);
    setModalVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MyReportSummary }) => (
      <MyReportItem report={item} onViewResult={handleViewResult} />
    ),
    [handleViewResult],
  );

  return (
    <SwipeBackEdge>
    <AuthGuard>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title={messages.nav.screenTitles.myReports} />
        {isLoading ? (
          <LoadingScreen />
        ) : !reports || reports.length === 0 ? (
          <EmptyState icon="flag-outline" title={m.noReports} />
        ) : (
          <FlatList
            data={reports}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.md }]}
            refreshing={isFetching}
            onRefresh={refetch}
            showsVerticalScrollIndicator={false}
          />
        )}
        <ReportResultModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          report={selectedReport}
        />
      </View>
    </AuthGuard>
  </SwipeBackEdge>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
