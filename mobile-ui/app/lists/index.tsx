import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ListCard } from '@/src/components/lists/ListCard';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getPublicLists } from '@/src/api/list';
import { ListCategory, type UserListPublic } from '@/src/models/list';
import { APP_CONFIG } from '@/src/constants/config';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

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

export default function DiscoverListsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ListCategory | undefined>(undefined);
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = APP_CONFIG.paginationDefaults.pageSize;

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setPage(1);
    }, 400);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['publicLists', debouncedSearch, selectedCategory, page],
    queryFn: () =>
      getPublicLists({
        page,
        pageSize,
        searchTerm: debouncedSearch || undefined,
        category: selectedCategory,
      }),
  });

  const lists = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = lists.length < totalCount;

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };

  const handleCategoryPress = (cat: ListCategory) => {
    setSelectedCategory((prev) => (prev === cat ? undefined : cat));
    setPage(1);
  };

  const renderItem = useCallback(
    ({ item }: { item: UserListPublic }) => <ListCard list={item} />,
    [],
  );

  const renderHeader = () => (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>
        {messages.lists.discoverTitle}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {messages.lists.discoverDescription}
      </Text>

      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
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
              setPage(1);
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
          const key = categoryKeyMap[item] as keyof typeof messages.lists.categories;
          return (
            <Pressable
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleCategoryPress(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: isActive ? '#ffffff' : colors.text },
                ]}
              >
                {messages.lists.categories[key]}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  if (isLoading && page === 1) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isError ? (
            <EmptyState
              icon="alert-circle-outline"
              title={messages.lists.loadError}
            />
          ) : (
            <EmptyState
              icon="list-outline"
              title={messages.lists.noListsForCriteria}
            />
          )
        }
        ListFooterComponent={
          isLoading && page > 1 ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.footerLoader}
            />
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: Spacing.lg,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
  },
  categoryRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
});
