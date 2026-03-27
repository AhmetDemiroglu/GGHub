import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing } from '@/src/constants/theme';
import { AuthGuard } from '@/src/components/common/AuthGuard';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { MyReportItem } from '@/src/components/reports/MyReportItem';
import { ReportResultModal } from '@/src/components/reports/ReportResultModal';
import { getMyReports } from '@/src/api/report';
import type { MyReportSummary } from '@/src/models/report';

export default function MyReportsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
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
    <AuthGuard>
      <Stack.Screen options={{ title: m.myReports, headerShown: true }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <LoadingScreen />
        ) : !reports || reports.length === 0 ? (
          <EmptyState icon="flag-outline" title={m.noReports} />
        ) : (
          <FlatList
            data={reports}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
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
