import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppTopBar } from '@/src/components/shell';
import { ListCard } from '@/src/components/lists/ListCard';
import { ListFormModal } from '@/src/components/lists/ListFormModal';
import { showDeleteListDialog } from '@/src/components/lists/DeleteListDialog';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getPublicLists, getMyLists, getFollowedListsByMe } from '@/src/api/list';
import { ListCategory, UserListType, type UserList, type UserListPublic } from '@/src/models/list';
import { APP_CONFIG } from '@/src/constants/config';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

// ── Keşfet alt-sekmesi için kategori listesi ──────────────────────────────────

const categoryList = [
  ListCategory.Other,
  ListCategory.Action,
  ListCategory.RPG,
  ListCategory.Strategy,
  ListCategory.Shooter,
  ListCategory.Adventure,
  ListCategory.Simulation,
  ListCategory.Sports,
  ListCategory.Puzzle,
  ListCategory.Horror,
];

const categoryKeyMap: Record<number, string> = {
  [ListCategory.Other]: 'other',
  [ListCategory.Action]: 'action',
  [ListCategory.RPG]: 'rpg',
  [ListCategory.Strategy]: 'strategy',
  [ListCategory.Shooter]: 'shooter',
  [ListCategory.Adventure]: 'adventure',
  [ListCategory.Simulation]: 'simulation',
  [ListCategory.Sports]: 'sports',
  [ListCategory.Puzzle]: 'puzzle',
  [ListCategory.Horror]: 'horror',
};

type RootTab = 'discover' | 'my';
type MySubTab = 'my' | 'following';

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function ListsTabScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rootTab, setRootTab] = useState<RootTab>('discover');

  // ── Keşfet state'i ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ListCategory | undefined>(undefined);
  const [discoverPage, setDiscoverPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = APP_CONFIG.paginationDefaults.pageSize;

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setDiscoverPage(1);
    }, 400);
  };

  const {
    data: discoverData,
    isLoading: discoverLoading,
    isError: discoverError,
    refetch: discoverRefetch,
  } = useQuery({
    queryKey: ['publicLists', debouncedSearch, selectedCategory, discoverPage],
    queryFn: () =>
      getPublicLists({
        page: discoverPage,
        pageSize,
        searchTerm: debouncedSearch || undefined,
        category: selectedCategory,
      }),
    enabled: rootTab === 'discover',
  });

  // ── Listelerim state'i ────────────────────────────────────────────────────
  const [mySubTab, setMySubTab] = useState<MySubTab>('my');
  const [followingPage, setFollowingPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<UserList | null>(null);

  const { data: myLists, isLoading: myLoading } = useQuery({
    queryKey: ['myLists'],
    queryFn: () => getMyLists(),
    enabled: isAuthenticated && rootTab === 'my',
  });

  const { data: followedData, isLoading: followedLoading } = useQuery({
    queryKey: ['followedLists', followingPage],
    queryFn: () =>
      getFollowedListsByMe({ page: followingPage, pageSize }),
    enabled: isAuthenticated && rootTab === 'my' && mySubTab === 'following',
  });

  const discoverLists = discoverData?.items ?? [];
  const discoverTotal = discoverData?.totalCount ?? 0;
  const hasMoreDiscover = discoverLists.length < discoverTotal;

  const customLists = (myLists ?? []).filter((l) => l.type === UserListType.Custom);
  const followedLists = followedData?.items ?? [];
  const hasMoreFollowed = followedLists.length < (followedData?.totalCount ?? 0);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderDiscoverItem = useCallback(
    ({ item }: { item: UserListPublic }) => <ListCard list={item} />,
    [],
  );

  const renderMyListItem = useCallback(
    ({ item }: { item: UserList }) => (
      <View>
        <ListCard list={item} />
        <View style={styles.listActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => setEditingList(item)}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              {messages.common.edit}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() =>
              showDeleteListDialog({ listId: item.id, listName: item.name, messages, queryClient, showToast })
            }
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>
              {messages.common.delete}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [colors, messages, queryClient, showToast],
  );

  const renderFollowedItem = useCallback(
    ({ item }: { item: UserListPublic }) => <ListCard list={item} />,
    [],
  );

  // ── Discover header ───────────────────────────────────────────────────────

  const DiscoverHeader = (
    <View style={styles.discoverHeader}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={messages.lists.searchPlaceholder}
          placeholderTextColor={colors.placeholder}
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
        {searchTerm ? (
          <Pressable
            onPress={() => {
              setSearchTerm('');
              setDebouncedSearch('');
              setDiscoverPage(1);
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={categoryList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item)}
        contentContainerStyle={styles.categoryRow}
        renderItem={({ item }) => {
          const isActive = selectedCategory === item;
          const catKey = categoryKeyMap[item] as keyof typeof messages.lists.categories;
          return (
            <Pressable
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                setSelectedCategory((prev) => (prev === item ? undefined : item));
                setDiscoverPage(1);
              }}
            >
              <Text style={[styles.categoryChipText, { color: isActive ? '#ffffff' : colors.text }]}>
                {messages.lists.categories[catKey]}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title={messages.nav.lists} />

      {/* Ana sekme çubuğu: Keşfet / Listelerim */}
      <View style={[styles.rootTabBar, { borderBottomColor: colors.border }]}>
        {(['discover', 'my'] as RootTab[]).map((tab) => {
          const label =
            tab === 'discover' ? messages.lists.discoverTitle : messages.lists.myListsTitle;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.rootTab,
                rootTab === tab && [styles.rootTabActive, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setRootTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rootTabText,
                  { color: rootTab === tab ? colors.primary : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Keşfet ── */}
      {rootTab === 'discover' ? (
        discoverLoading && discoverPage === 1 ? (
          <LoadingScreen />
        ) : (
          <FlatList
            data={discoverLists}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderDiscoverItem}
            ListHeaderComponent={DiscoverHeader}
            ListEmptyComponent={
              discoverError ? (
                <EmptyState icon="alert-circle-outline" title={messages.lists.loadError} />
              ) : (
                <EmptyState icon="list-outline" title={messages.lists.noListsForCriteria} />
              )
            }
            ListFooterComponent={
              discoverLoading && discoverPage > 1 ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
              ) : null
            }
            onEndReached={() => {
              if (hasMoreDiscover && !discoverLoading) setDiscoverPage((p) => p + 1);
            }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : null}

      {/* ── Listelerim ── */}
      {rootTab === 'my' ? (
        !isAuthenticated ? (
          <EmptyState
            icon="lock-closed-outline"
            title={messages.lists.unauthorizedTitle}
            description={messages.lists.unauthorizedDescription}
          />
        ) : (
          <View style={styles.flex}>
            {/* Alt sekme: Benim / Takip */}
            <View style={[styles.mySubTabBar, { borderBottomColor: colors.border }]}>
              {(['my', 'following'] as MySubTab[]).map((st) => {
                const stLabel = st === 'my' ? messages.lists.myListsTab : messages.lists.followedListsTab;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.mySubTab,
                      mySubTab === st && [styles.mySubTabActive, { borderBottomColor: colors.primary }],
                    ]}
                    onPress={() => setMySubTab(st)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.mySubTabText,
                        { color: mySubTab === st ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {stLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {mySubTab === 'my' ? (
              myLoading ? (
                <LoadingScreen />
              ) : (
                <FlatList
                  data={customLists}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderMyListItem}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <EmptyState icon="list-outline" title={messages.lists.noMyLists} />
                  }
                />
              )
            ) : (
              followedLoading && followingPage === 1 ? (
                <LoadingScreen />
              ) : (
                <FlatList
                  data={followedLists}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderFollowedItem}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <EmptyState icon="heart-outline" title={messages.lists.noFollowedLists} />
                  }
                  ListFooterComponent={
                    followedLoading && followingPage > 1 ? (
                      <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
                    ) : null
                  }
                  onEndReached={() => {
                    if (hasMoreFollowed && !followedLoading) setFollowingPage((p) => p + 1);
                  }}
                  onEndReachedThreshold={0.5}
                />
              )
            )}

            {/* Yeni Liste FAB */}
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
          </View>
        )
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  rootTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  rootTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  rootTabActive: {
    borderBottomWidth: 2,
  },
  rootTabText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  discoverHeader: {
    paddingTop: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  categoryRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  mySubTabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mySubTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mySubTabActive: {
    borderBottomWidth: 2,
  },
  mySubTabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
