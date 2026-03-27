import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { UserTabs } from '@/src/components/admin/UserTabs';
import { getUserDetails, banUser, unbanUser, changeUserRole } from '@/src/api/admin';

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Number(id);
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const m = messages.admin;

  const [banSheetVisible, setBanSheetVisible] = useState(false);
  const [banReason, setBanReason] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user-detail', userId],
    queryFn: () => getUserDetails(userId).then((res) => res.data),
    enabled: !!userId,
  });

  const banMutation = useMutation({
    mutationFn: () => banUser(userId, { reason: banReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setBanSheetVisible(false);
      setBanReason('');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: () => unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: (newRole: 'Admin' | 'User') => changeUserRole(userId, { newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const handleBan = () => {
    if (user?.isBanned) {
      Alert.alert(m.unban, m.unbanConfirm, [
        { text: messages.common.cancel, style: 'cancel' },
        { text: messages.common.confirm, onPress: () => unbanMutation.mutate() },
      ]);
    } else {
      setBanSheetVisible(true);
    }
  };

  const handleRoleChange = () => {
    const newRole = user?.role === 'Admin' ? 'User' : 'Admin';
    Alert.alert(m.changeRole, m.changeRoleConfirm, [
      { text: messages.common.cancel, style: 'cancel' },
      { text: messages.common.confirm, onPress: () => roleMutation.mutate(newRole) },
    ]);
  };

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Avatar uri={user.profileImageUrl} name={user.username} size={72} />
        <Text style={[styles.username, { color: colors.text }]}>{user.username}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
        {user.firstName || user.lastName ? (
          <Text style={[styles.fullName, { color: colors.textSecondary }]}>
            {[user.firstName, user.lastName].filter(Boolean).join(' ')}
          </Text>
        ) : null}
        <View style={styles.badgeRow}>
          <Badge
            label={user.role}
            color={user.role === 'Admin' ? '#6366f1' : colors.surfaceHighlight}
            textColor={user.role === 'Admin' ? '#ffffff' : colors.textSecondary}
          />
          <Badge
            label={user.isBanned ? m.statusBanned : m.statusActive}
            color={user.isBanned ? '#ef444420' : '#22c55e20'}
            textColor={user.isBanned ? '#ef4444' : '#22c55e'}
          />
          <Badge
            label={user.isEmailVerified ? m.emailVerified : m.emailNotVerified}
            color={user.isEmailVerified ? '#22c55e20' : '#f59e0b20'}
            textColor={user.isEmailVerified ? '#22c55e' : '#f59e0b'}
          />
        </View>
        <Text style={[styles.joinDate, { color: colors.textMuted }]}>
          {m.joinDate}: {new Date(user.createdAt).toLocaleDateString()}
        </Text>
        {user.isBanned && user.banReason ? (
          <View style={[styles.banReasonBox, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}>
            <Ionicons name="ban" size={16} color={colors.error} />
            <Text style={[styles.banReasonText, { color: colors.error }]}>
              {user.banReason}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          title={user.isBanned ? m.unban : m.ban}
          onPress={handleBan}
          variant={user.isBanned ? 'secondary' : 'danger'}
          loading={banMutation.isPending || unbanMutation.isPending}
          icon={<Ionicons name={user.isBanned ? 'checkmark-circle' : 'ban'} size={18} color={user.isBanned ? colors.text : '#ffffff'} />}
          style={styles.actionButton}
        />
        <Button
          title={user.role === 'Admin' ? m.makeUser : m.makeAdmin}
          onPress={handleRoleChange}
          variant="outline"
          loading={roleMutation.isPending}
          icon={<Ionicons name="shield" size={18} color={colors.primary} />}
          style={styles.actionButton}
        />
      </View>

      <UserTabs userId={userId} />

      <BottomSheet
        visible={banSheetVisible}
        onClose={() => setBanSheetVisible(false)}
        title={m.ban}
      >
        <Input
          label={m.banReason}
          placeholder={m.banReasonPlaceholder}
          value={banReason}
          onChangeText={setBanReason}
          multiline
          numberOfLines={4}
          style={styles.banInput}
        />
        <Button
          title={m.ban}
          onPress={() => banMutation.mutate()}
          variant="danger"
          loading={banMutation.isPending}
          disabled={banReason.length < 3}
          style={styles.banButton}
        />
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  username: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  email: {
    fontSize: FontSize.md,
  },
  fullName: {
    fontSize: FontSize.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  joinDate: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  banReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: '100%',
  },
  banReasonText: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  banInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  banButton: {
    marginTop: Spacing.md,
  },
});
