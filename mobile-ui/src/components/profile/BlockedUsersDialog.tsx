import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { Button } from '@/src/components/common/Button';
import { BottomSheet, BottomSheetFlatList } from '@/src/components/common/BottomSheet';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getBlockedUsers, unblockUser } from '@/src/api/social';
import type { BlockedUser } from '@/src/models/social';
import { Spacing, FontSize } from '@/src/constants/theme';

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
    // Ortak alt pencere kabugu. Engellenen listesi cogu zaman kisa oldugu icin
    // icerik kadar acilir; uzunsa %80'de durup kendi icinde kayar.
    <BottomSheet visible={visible} onClose={onClose} title={bd.title}>
      <BottomSheetFlatList
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
    </BottomSheet>
  );
}

// Yatay bosluk pencerenin kendisinden gelir (BottomSheet paddingHorizontal).
const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.sm,
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
