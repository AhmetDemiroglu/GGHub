import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import * as haptics from '@/src/utils/haptics';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getMyLists, addGameToList, removeGameFromList } from '@/src/api/list';
import type { UserList } from '@/src/models/list';

interface AddToListModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: number;
}

export function AddToListModal({ visible, onClose, gameId }: AddToListModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { height } = useWindowDimensions();

  const { data: lists, isLoading } = useQuery({
    queryKey: ['myLists', gameId],
    queryFn: () => getMyLists(gameId),
    enabled: visible,
  });

  const addMutation = useMutation({
    mutationFn: (listId: number) => addGameToList(listId, gameId),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['myLists', gameId] });
      showToast('success', messages.games.gameAddedToList);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (listId: number) => removeGameFromList(listId, gameId),
    onSuccess: () => {
      haptics.impactLight();
      queryClient.invalidateQueries({ queryKey: ['myLists', gameId] });
      showToast('info', messages.games.gameRemovedFromList);
    },
  });

  const handleToggle = (list: UserList) => {
    haptics.impactLight();
    if (list.containsCurrentGame) {
      removeMutation.mutate(list.id);
    } else {
      addMutation.mutate(list.id);
    }
  };

  const renderItem = ({ item }: { item: UserList }) => (
    <Pressable
      style={[styles.listItem, { borderBottomColor: colors.border }]}
      onPress={() => handleToggle(item)}
      disabled={addMutation.isPending || removeMutation.isPending}
    >
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.listCount, { color: colors.textMuted }]}>
          {item.gameCount} {messages.home.stats.games.toLowerCase?.() ?? 'games'}
        </Text>
      </View>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: item.containsCurrentGame ? colors.primary : colors.border,
            backgroundColor: item.containsCurrentGame ? colors.primary : 'transparent',
          },
        ]}
      >
        {item.containsCurrentGame && <Ionicons name="checkmark" size={16} color="#ffffff" />}
      </View>
    </Pressable>
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title={messages.games.addToList}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : !lists || lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{messages.games.noLists}</Text>
          <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
            {messages.games.noListsDescription}
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: height * 0.5 }}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: Spacing.xxxl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  listCount: {
    fontSize: FontSize.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  emptyDescription: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
});
