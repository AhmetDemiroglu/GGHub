import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ListCard } from '@/src/components/lists/ListCard';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { ListFormModal } from '@/src/components/lists/ListFormModal';
import { showDeleteListDialog } from '@/src/components/lists/DeleteListDialog';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getMyLists, getFollowedListsByMe } from '@/src/api/list';
import { UserListType, type UserList, type UserListPublic } from '@/src/models/list';
import { APP_CONFIG } from '@/src/constants/config';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

type TabKey = 'my' | 'following';

export default function MyListsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<UserList | null>(null);
  const [followingPage, setFollowingPage] = useState(1);

  const {
    data: myLists,
    isLoading: myLoading,
    isError: myError,
  } = useQuery({
    queryKey: ['myLists'],
    queryFn: () => getMyLists(),
    enabled: isAuthenticated,
  });

  const {
    data: followedData,
    isLoading: followedLoading,
    isError: followedError,
  } = useQuery({
    queryKey: ['followedLists', followingPage],
    queryFn: () =>
      getFollowedListsByMe({
        page: followingPage,
        pageSize: APP_CONFIG.paginationDefaults.pageSize,
      }),
    enabled: isAuthenticated && activeTab === 'following',
  });

  const customLists = (myLists ?? []).filter(
    (l) => l.type === UserListType.Custom,
  );
  const followedLists = followedData?.items ?? [];
  const hasMoreFollowed =
    followedLists.length < (followedData?.totalCount ?? 0);

  const handleEdit = (list: UserList) => {
    setEditingList(list);
  };

  const handleDelete = (list: UserList) => {
    showDeleteListDialog({
      listId: list.id,
      listName: list.name,
      messages,
      queryClient,
      showToast,
    });
  };

  if (!isAuthenticated) {
    return (
      <ScreenWrapper>
        <EmptyState
          icon="lock-closed-outline"
          title={messages.lists.unauthorizedTitle}
          description={messages.lists.unauthorizedDescription}
        />
      </ScreenWrapper>
    );
  }

  const renderMyListItem = useCallback(
    ({ item }: { item: UserList }) => (
      <View>
        <ListCard list={item} />
        <View style={styles.listActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              {messages.common.edit}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>
              {messages.common.delete}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [colors, messages],
  );

  const renderFollowedItem = useCallback(
    ({ item }: { item: UserListPublic }) => <ListCard list={item} />,
    [],
  );

  const isLoading = activeTab === 'my' ? myLoading : followedLoading;

  return (
    <ScreenWrapper>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {messages.lists.myListsTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {messages.lists.myListsDescription}
        </Text>

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'my' && [
                styles.activeTab,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('my')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'my' ? colors.primary : colors.textSecondary },
              ]}
            >
              {messages.lists.myListsTab}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'following' && [
                styles.activeTab,
                { borderBottomColor: colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('following')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'following'
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              {messages.lists.followedListsTab}
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : activeTab === 'my' ? (
        <FlatList
          data={customLists}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMyListItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="list-outline"
              title={messages.lists.noMyLists}
            />
          }
        />
      ) : (
        <FlatList
          data={followedLists}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFollowedItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title={messages.lists.noFollowedLists}
            />
          }
          ListFooterComponent={
            followedLoading && followingPage > 1 ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.footerLoader}
              />
            ) : null
          }
          onEndReached={() => {
            if (hasMoreFollowed && !followedLoading) {
              setFollowingPage((p) => p + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>

      <ListFormModal
        visible={showCreateModal || !!editingList}
        onClose={() => {
          setShowCreateModal(false);
          setEditingList(null);
        }}
        editingList={editingList}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.lg,
  },
  listActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xxxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
