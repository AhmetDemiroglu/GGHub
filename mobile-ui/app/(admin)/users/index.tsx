import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Input } from '@/src/components/common/Input';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { getUsers } from '@/src/api/admin';
import { APP_CONFIG } from '@/src/constants/config';
import type { AdminUserSummary, UserFilterParams } from '@/src/models/admin';

type StatusFilter = 'All' | 'Active' | 'Banned';

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [page, setPage] = useState(1);
  const pageSize = APP_CONFIG.paginationDefaults.adminPageSize;

  const params: UserFilterParams = {
    page,
    pageSize,
    searchTerm: searchTerm || undefined,
    statusFilter: statusFilter === 'All' ? undefined : statusFilter,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => getUsers(params).then((res) => res.data),
  });

  const users = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = page * pageSize < totalCount;

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'All', label: m.statusAll },
    { key: 'Active', label: m.statusActive },
    { key: 'Banned', label: m.statusBanned },
  ];

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isFetching]);

  const renderUser = useCallback(
    ({ item }: { item: AdminUserSummary }) => (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/(admin)/users/${item.id}`)}
      >
        <Avatar uri={item.profileImageUrl} name={item.username} size={44} />
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
          <Text style={[styles.joinDate, { color: colors.textMuted }]}>
            {m.joinDate}: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.badges}>
          <Badge
            label={item.role}
            color={item.role === 'Admin' ? '#6366f1' : colors.surfaceHighlight}
            textColor={item.role === 'Admin' ? '#ffffff' : colors.textSecondary}
          />
          <Badge
            label={item.isBanned ? m.statusBanned : m.statusActive}
            color={item.isBanned ? '#ef444420' : '#22c55e20'}
            textColor={item.isBanned ? '#ef4444' : '#22c55e'}
          />
        </View>
      </TouchableOpacity>
    ),
    [colors, router, m],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Input
          placeholder={m.searchUsersPlaceholder}
          value={searchTerm}
          onChangeText={(text) => {
            setSearchTerm(text);
            setPage(1);
          }}
          autoCapitalize="none"
        />
        <View style={styles.filters}>
          {statusFilters.map((f) => (
            <TouchableOpacity
              key={f.key}
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
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : users.length === 0 ? (
        <EmptyState icon="people-outline" title={m.noUsersFound} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => String(item.id)}
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
    paddingBottom: 0,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  email: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  joinDate: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
