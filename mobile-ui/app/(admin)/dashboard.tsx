import React, { useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { StatsCard } from '@/src/components/admin/StatsCard';
import { RecentReportsList } from '@/src/components/admin/RecentReportsList';
import { RecentUsersList } from '@/src/components/admin/RecentUsersList';
import { RecentReviewsList } from '@/src/components/admin/RecentReviewsList';
import { QuickSearch } from '@/src/components/admin/QuickSearch';
import { TopCards } from '@/src/components/admin/TopCards';
import { getDashboardStats, getRecentUsers, getRecentReviews, getReports } from '@/src/api/admin';
import { ReportStatus } from '@/src/models/report';

export default function AdminDashboard() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const { logout } = useAuth();
  const m = messages.admin;

  const handleBackToApp = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => getDashboardStats().then((res) => res.data),
  });

  const recentReportsQuery = useQuery({
    queryKey: ['admin', 'recent-reports'],
    queryFn: () =>
      getReports({ page: 1, pageSize: 5, statusFilter: ReportStatus.Open }).then(
        (res) => res.data.items,
      ),
  });

  const recentUsersQuery = useQuery({
    queryKey: ['admin', 'recent-users'],
    queryFn: () => getRecentUsers(5).then((res) => res.data),
  });

  const recentReviewsQuery = useQuery({
    queryKey: ['admin', 'recent-reviews'],
    queryFn: () => getRecentReviews(5).then((res) => res.data),
  });

  const isLoading =
    statsQuery.isLoading &&
    recentReportsQuery.isLoading &&
    recentUsersQuery.isLoading &&
    recentReviewsQuery.isLoading;

  const isRefreshing =
    statsQuery.isFetching ||
    recentReportsQuery.isFetching ||
    recentUsersQuery.isFetching ||
    recentReviewsQuery.isFetching;

  const onRefresh = useCallback(() => {
    statsQuery.refetch();
    recentReportsQuery.refetch();
    recentUsersQuery.refetch();
    recentReviewsQuery.refetch();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const stats = statsQuery.data;

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackToApp} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          ),
        }}
      />
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statsGrid}>
        <StatsCard
          icon="people"
          label={m.totalUsers}
          value={stats?.totalUsers ?? 0}
          color={colors.primary}
        />
        <StatsCard
          icon="ban"
          label={m.bannedUsers}
          value={stats?.bannedUsers ?? 0}
          color={colors.error}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatsCard
          icon="flag"
          label={m.pendingReports}
          value={stats?.pendingReports ?? 0}
          color={colors.warning}
        />
        <StatsCard
          icon="chatbox"
          label={m.totalReviews}
          value={stats?.totalReviews ?? 0}
          color={colors.success}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.recentReportsTitle}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/reports')}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>{m.viewAll}</Text>
          </TouchableOpacity>
        </View>
        <RecentReportsList reports={recentReportsQuery.data ?? []} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.recentUsersTitle}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/users')}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>{m.viewAll}</Text>
          </TouchableOpacity>
        </View>
        <RecentUsersList users={recentUsersQuery.data ?? []} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.recentReviewsTitle}</Text>
        <RecentReviewsList reviews={recentReviewsQuery.data ?? []} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{m.quickSearchTitle}</Text>
        <View style={styles.searchContainer}>
          <QuickSearch />
        </View>
      </View>

      <TopCards />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBtn: {
    padding: 4,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  searchContainer: {
    marginTop: Spacing.sm,
  },
});
