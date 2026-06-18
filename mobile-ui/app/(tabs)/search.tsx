import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppTopBar } from '@/src/components/shell';
import { Avatar } from '@/src/components/common/Avatar';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { searchAll } from '@/src/api/search';
import { toMobileRoute } from '@/src/utils/route';
import { getImageUrl } from '@/src/utils/image';
import type { SearchResult } from '@/src/models/search';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

type ResultKind = 'user' | 'game' | 'list' | 'other';

const DEBOUNCE_MS = 350;

// Backend `type` alanini Turkce dondurdugu icin sonuc tipini locale-bagimsiz
// sekilde link'ten turet (kullanici/oyun/liste).
function kindFromLink(link: string): ResultKind {
  if (link.includes('/profiles/') || link.includes('/messages/')) return 'user';
  if (link.includes('/game')) return 'game';
  if (link.includes('/list')) return 'list';
  return 'other';
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const t = messages.search;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(text.trim()), DEBOUNCE_MS);
  };

  const clearQuery = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 15000,
  });

  const results: SearchResult[] = data ?? [];

  const handleResultPress = useCallback(
    (item: SearchResult) => {
      router.push(toMobileRoute(item.link) as any);
    },
    [router],
  );

  const typeIcon = (kind: ResultKind): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (kind) {
      case 'user':
        return 'person-outline';
      case 'game':
        return 'game-controller-outline';
      case 'list':
        return 'list-outline';
      default:
        return 'search-outline';
    }
  };

  const typeLabel = (kind: ResultKind): string | null => {
    switch (kind) {
      case 'user':
        return t.typeUser;
      case 'game':
        return t.typeGame;
      case 'list':
        return t.typeList;
      default:
        return null;
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      const kind = kindFromLink(item.link);
      const imageUri = getImageUrl(item.imageUrl);
      const label = typeLabel(kind);
      return (
        <TouchableOpacity
          style={[styles.resultItem, { borderBottomColor: colors.border }]}
          onPress={() => handleResultPress(item)}
          activeOpacity={0.7}
        >
          {kind === 'user' ? (
            <Avatar uri={item.imageUrl} name={item.title} size={44} />
          ) : kind === 'game' && imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.gameCover} resizeMode="cover" />
          ) : (
            <View style={[styles.resultIcon, { backgroundColor: colors.surfaceHighlight }]}>
              <Ionicons name={typeIcon(kind)} size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.resultText}>
            <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
          {label ? (
            <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [colors, handleResultPress, t],
  );

  const showEmpty = debouncedQuery.length >= 2 && !isLoading && results.length === 0;
  const showPrompt = debouncedQuery.length < 2 && query.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppTopBar title={t.title} />

      {/* Arama kutusu */}
      <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Ionicons name="search-outline" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t.placeholder}
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={handleQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={clearQuery} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* İçerik */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : showPrompt ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>{t.startTyping}</Text>
        </View>
      ) : showEmpty ? (
        <View style={styles.center}>
          <Ionicons name="sad-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>{t.noResults}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: Spacing.sm, paddingBottom: tabBarHeight + Spacing.md },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  hintText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCover: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  resultSubtitle: {
    fontSize: FontSize.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
