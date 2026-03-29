import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { searchAll } from '@/src/api/search';
import type { SearchResult } from '@/src/models/search';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

type ScopeKey = 'all' | 'user' | 'game' | 'list';

const DEBOUNCE_MS = 350;

export default function SearchScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const t = messages.search;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [scope, setScope] = useState<ScopeKey>('all');
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

  const filtered: SearchResult[] = (data ?? []).filter(
    (r) => scope === 'all' || r.type.toLowerCase() === scope,
  );

  const handleResultPress = useCallback(
    (item: SearchResult) => {
      router.push(item.link as any);
    },
    [router],
  );

  const scopes: { key: ScopeKey; label: string }[] = [
    { key: 'all', label: t.scopeAll },
    { key: 'user', label: t.scopeUsers },
    { key: 'game', label: t.scopeGames },
    { key: 'list', label: t.scopeLists },
  ];

  const typeIcon = (type: string): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (type.toLowerCase()) {
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

  const typeLabel = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'user':
        return t.typeUser;
      case 'game':
        return t.typeGame;
      case 'list':
        return t.typeList;
      default:
        return type;
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: colors.border }]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        {item.type.toLowerCase() === 'user' ? (
          <Avatar uri={item.imageUrl} name={item.title} size={40} />
        ) : (
          <View style={[styles.resultIcon, { backgroundColor: colors.surfaceHighlight }]}>
            <Ionicons name={typeIcon(item.type)} size={20} color={colors.textSecondary} />
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
        <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>
            {typeLabel(item.type)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [colors, handleResultPress, t],
  );

  const showEmpty =
    debouncedQuery.length >= 2 && !isLoading && filtered.length === 0;
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

      {/* Scope filter */}
      <View style={[styles.scopeRow, { borderBottomColor: colors.border }]}>
        {scopes.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.scopeBtn,
              scope === s.key && [styles.scopeBtnActive, { borderBottomColor: colors.primary }],
            ]}
            onPress={() => setScope(s.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.scopeLabel,
                { color: scope === s.key ? colors.primary : colors.textSecondary },
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
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
          data={filtered}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
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
  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  scopeBtnActive: {
    borderBottomWidth: 2,
  },
  scopeLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
