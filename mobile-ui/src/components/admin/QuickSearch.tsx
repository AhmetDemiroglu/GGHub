import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Input } from '@/src/components/common/Input';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import { getUsers } from '@/src/api/admin';
import type { AdminUserSummary } from '@/src/models/admin';

export function QuickSearch() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  const [searchTerm, setSearchTerm] = useState('');

  const { data } = useQuery({
    queryKey: ['admin', 'quick-search', searchTerm],
    queryFn: () => getUsers({ searchTerm, page: 1, pageSize: 5 }).then((res) => res.data),
    enabled: searchTerm.length >= 2,
  });

  const users = data?.items ?? [];

  const renderUser = useCallback(
    ({ item }: { item: AdminUserSummary }) => (
      <TouchableOpacity
        style={[styles.userItem, { borderBottomColor: colors.border }]}
        onPress={() => router.push(`/(admin)/users/${item.id}`)}
      >
        <Avatar uri={item.profileImageUrl} name={item.username} size={32} />
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
        </View>
        <Badge
          label={item.role}
          color={item.role === 'Admin' ? '#6366f1' : colors.surfaceHighlight}
          textColor={item.role === 'Admin' ? '#ffffff' : colors.textSecondary}
        />
      </TouchableOpacity>
    ),
    [colors, router],
  );

  return (
    <View>
      <Input
        placeholder={m.quickSearchPlaceholder}
        value={searchTerm}
        onChangeText={setSearchTerm}
        autoCapitalize="none"
      />
      {searchTerm.length >= 2 && users.length > 0 ? (
        <View style={[styles.results, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[styles.userItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSearchTerm('');
                router.push(`/(admin)/users/${user.id}`);
              }}
            >
              <Avatar uri={user.profileImageUrl} name={user.username} size={32} />
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{user.username}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  results: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: -Spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  email: {
    fontSize: FontSize.xs,
  },
});
