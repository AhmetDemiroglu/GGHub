import React from 'react';
import { View, Text, FlatList, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { Button } from '@/src/components/common/Button';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getBlockedUsers, unblockUser } from '@/src/api/social';
import type { BlockedUser } from '@/src/models/social';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface BlockedUsersDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function BlockedUsersDialog({ visible, onClose }: BlockedUsersDialogProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const queryClient = useQueryClient();
  const bd = messages.profile.blockedUsersDialog;

  const blockedQuery = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () => getBlockedUsers(),
    enabled: visible,
  });

  const unblockMutation = useMutation({
    mutationFn: (username: string) => unblockUser(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });

  const renderItem = ({ item }: { item: BlockedUser }) => {
    const displayName =
      [item.firstName, item.lastName].filter(Boolean).join(' ') || item.username;

    return (
      <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
        <Avatar uri={item.profileImageUrl} name={displayName} size={44} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
        <Button
          title={bd.unblock}
          variant="outline"
          size="sm"
          onPress={() => unblockMutation.mutate(item.username)}
          loading={unblockMutation.isPending}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{bd.title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={blockedQuery.data || []}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {bd.noUsers}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
  },
});
