import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize } from '@/src/constants/theme';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import type { AdminUserSummary } from '@/src/models/admin';

interface RecentUsersListProps {
  users: AdminUserSummary[];
}

export function RecentUsersList({ users }: RecentUsersListProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  if (users.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>{m.noUsersFound}</Text>
    );
  }

  return (
    <View>
      {users.map((user) => (
        <TouchableOpacity
          key={user.id}
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => router.push(`/(admin)/users/${user.id}`)}
        >
          <Avatar uri={user.profileImageUrl} name={user.username} size={36} />
          <View style={styles.info}>
            <Text style={[styles.username, { color: colors.text }]}>{user.username}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
          </View>
          <View style={styles.badges}>
            <Badge label={user.role} color={user.role === 'Admin' ? '#6366f1' : colors.surfaceHighlight} textColor={user.role === 'Admin' ? '#ffffff' : colors.textSecondary} />
            {user.isBanned ? (
              <Badge label={m.statusBanned} color="#ef444420" textColor="#ef4444" />
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  email: {
    fontSize: FontSize.xs,
  },
  badges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
