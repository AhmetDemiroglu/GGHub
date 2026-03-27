import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { gameApi } from '@/src/api/game';
import { FilterBar } from '@/src/components/discover/FilterBar';
import { GameCard } from '@/src/components/discover/GameCard';
import type { Game, DiscoverParams } from '@/src/models/game';

const PAGE_SIZE = 15;

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const t = messages.discover;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedOrdering, setSelectedOrdering] = useState('');
  const [page, setPage] = useState(1);
  // Tüm sayfaların biriktirilmiş oyunları — rawgId ile dedup edilir
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const params: DiscoverParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: searchQuery || undefined,
      genres: selectedGenre || undefined,
      platforms: selectedPlatform || undefined,
      ordering: selectedOrdering || undefined,
    }),
    [page, searchQuery, selectedGenre, selectedPlatform, selectedOrdering],
  );

  const gamesQuery = useQuery({
    queryKey: ['discoverGames', params],
    queryFn: async () => {
      const result = await gameApi.discover(params);

      if (page === 1) {
        // İlk sayfa: dedup ve yeniden başla
        const seen = new Set<number>();
        const unique = result.items.filter((g) => {
          if (seen.has(g.rawgId)) return false;
          seen.add(g.rawgId);
          return true;
        });
        setAllGames(unique);
      } else {
        // Sonraki sayfalar: mevcut listeye ekle, rawgId ile dedup
        setAllGames((prev) => {
          const existingRawgIds = new Set(prev.map((g) => g.rawgId));
          const newItems = result.items.filter((g) => !existingRawgIds.has(g.rawgId));
          return [...prev, ...newItems];
        });
      }

      setTotalCount(result.totalCount);
      return result;
    },
    staleTime: 30000,
  });

  // Filtre değişince sayfa ve listeyi sıfırla
  const resetAndSearch = useCallback(() => {
    setPage(1);
    setAllGames([]);
  }, []);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      resetAndSearch();
    },
    [resetAndSearch],
  );

  const handleGenreChange = useCallback(
    (genre: string) => {
      setSelectedGenre(genre);
      resetAndSearch();
    },
    [resetAndSearch],
  );

  const handlePlatformChange = useCallback(
    (platform: string) => {
      setSelectedPlatform(platform);
      resetAndSearch();
    },
    [resetAndSearch],
  );

  const handleOrderingChange = useCallback(
    (ordering: string) => {
      setSelectedOrdering(ordering);
      resetAndSearch();
    },
    [resetAndSearch],
  );

  const handleLoadMore = useCallback(() => {
    if (!gamesQuery.isFetching && allGames.length < totalCount) {
      setPage((prev) => prev + 1);
    }
  }, [gamesQuery.isFetching, allGames.length, totalCount]);

  // Genre ve platform seçenekleri — slug formatında (backend DB slug saklar, numeric ID slug'a çevirir)
  const genreOptions = useMemo(
    () => [
      { label: t.genres.action,              value: 'action' },
      { label: t.genres.adventure,           value: 'adventure' },
      { label: t.genres.rpg,                 value: 'role-playing-games-rpg' },
      { label: t.genres.strategy,            value: 'strategy' },
      { label: t.genres.shooter,             value: 'shooter' },
      { label: t.genres.simulation,          value: 'simulation' },
      { label: t.genres.puzzle,              value: 'puzzle' },
      { label: t.genres.sports,              value: 'sports' },
      { label: t.genres.racing,              value: 'racing' },
      { label: t.genres.indie,               value: 'indie' },
      { label: t.genres.fighting,            value: 'fighting' },
      { label: t.genres.arcade,              value: 'arcade' },
      { label: t.genres.platformer,          value: 'platformer' },
      { label: t.genres.massivelyMultiplayer, value: 'massively-multiplayer' },
    ],
    [t.genres],
  );

  const platformOptions = useMemo(
    () => [
      { label: 'PC',              value: 'pc' },
      { label: 'PlayStation 5',  value: 'playstation5' },
      { label: 'PlayStation 4',  value: 'playstation4' },
      { label: 'Xbox Series X',  value: 'xbox-series-x' },
      { label: 'Xbox One',       value: 'xbox-one' },
      { label: 'Nintendo Switch', value: 'nintendo-switch' },
      { label: 'iOS',            value: 'ios' },
      { label: 'Android',        value: 'android' },
      { label: 'macOS',          value: 'macos' },
      { label: 'Linux',          value: 'linux' },
    ],
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Game }) => <GameCard game={item} variant="list" />,
    [],
  );

  const renderFooter = () => {
    // Sayfa 1 haricinde yükleniyorsa footer spinner göster
    if (!gamesQuery.isFetching || page === 1) return null;
    return (
      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={styles.footerLoader}
      />
    );
  };

  const renderEmpty = () => {
    if (gamesQuery.isLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (gamesQuery.isError) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t.error.replace('{message}', '')}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t.noGames}
        </Text>
        <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
          {t.description}
        </Text>
      </View>
    );
  };

  const formattedCount = totalCount.toLocaleString(
    locale === 'tr' ? 'tr-TR' : 'en-US',
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{t.description}</Text>
      </View>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedGenre={selectedGenre}
        onGenreChange={handleGenreChange}
        selectedPlatform={selectedPlatform}
        onPlatformChange={handlePlatformChange}
        selectedOrdering={selectedOrdering}
        onOrderingChange={handleOrderingChange}
        genres={genreOptions}
        platforms={platformOptions}
      />

      {totalCount > 0 && !gamesQuery.isLoading && (
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {t.gamesFound.replace('{count}', formattedCount)}
        </Text>
      )}

      <FlatList
        data={allGames}
        renderItem={renderItem}
        // rawgId benzersiz ve her zaman mevcut; id=0 bug'ından bağımsız
        keyExtractor={(item) => item.rawgId.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  description: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  countText: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontSize: FontSize.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
  },
  emptyDescription: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
});
