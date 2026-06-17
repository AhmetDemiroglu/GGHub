import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { Avatar } from '@/src/components/common/Avatar';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { searchMessageableUsers } from '@/src/api/search';
import { getFollowing } from '@/src/api/social';
import { toMobileRoute } from '@/src/utils/route';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

interface NewMessageSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface UserRow {
  key: string;
  label: string;
  sublabel?: string | null;
  imageUrl?: string | null;
  route: string;
}

/**
 * X tarzı "yeni mesaj" akışı: alttan açılan sheet içinde kendi arama kutusu var.
 * Arama boşken takip ettiğin kullanıcılar öneri olarak listelenir; isim yazınca
 * backend (searchMessageableUsers) engellenen, mesaj kapalı ve takip-gerektiren
 * gizlilik kurallarını uygulayarak mesaj atılabilecek kullanıcıları döner. Bir
 * kullanıcıya basınca sheet kapanır ve o kişinin sohbet ekranı açılır; kullanıcı
 * mesaj atmadan da sheet'i kaydırarak kapatabilir.
 */
export function NewMessageSheet({ visible, onClose }: NewMessageSheetProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const t = messages.messages;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(text.trim()), DEBOUNCE_MS);
  };

  const isSearching = debouncedQuery.length >= MIN_QUERY;

  const searchQuery = useQuery({
    queryKey: ['messageableUsers', debouncedQuery],
    queryFn: () => searchMessageableUsers(debouncedQuery),
    enabled: visible && isSearching,
    staleTime: 15000,
  });

  // Arama boşken takip edilen kullanıcıları öneri olarak göster.
  const suggestionsQuery = useQuery({
    queryKey: ['following', user?.username],
    queryFn: () => getFollowing(user!.username),
    enabled: visible && !!user?.username && !isSearching,
    staleTime: 60000,
  });

  const handleClose = useCallback(() => {
    // Sheet tekrar açıldığında temiz gelsin diye arama state'ini sıfırla.
    setQuery('');
    setDebouncedQuery('');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (route: string) => {
      handleClose();
      router.push(route as any);
    },
    [handleClose, router],
  );

  const searchRows: UserRow[] = (searchQuery.data ?? []).map((r) => ({
    key: `${r.type}-${r.id}`,
    label: r.title,
    sublabel: r.subtitle,
    imageUrl: r.imageUrl,
    route: toMobileRoute(r.link),
  }));

  const suggestionRows: UserRow[] = (suggestionsQuery.data ?? []).map((s) => ({
    key: `follow-${s.id}`,
    label: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username,
    sublabel: `@${s.username}`,
    imageUrl: s.profileImageUrl,
    route: `/messages/${s.username}`,
  }));

  const renderRow = useCallback(
    ({ item }: { item: UserRow }) => (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: colors.border }]}
        onPress={() => handleSelect(item.route)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.imageUrl} name={item.label} size={44} />
        <View style={styles.userText}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {item.label}
          </Text>
          {item.sublabel ? (
            <Text
              style={[styles.userSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.sublabel}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    ),
    [colors, handleSelect],
  );

  // Liste alanına klavyenin üstünde sığacak makul bir yükseklik ver. FlatList
  // sınırlı yükseklik olmadan sheet içinde 0 px'e çöker.
  const bodyHeight = Math.round(height * 0.42);

  const renderBody = () => {
    if (isSearching) {
      if (searchQuery.isLoading) {
        return (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        );
      }
      if (searchRows.length === 0) {
        return (
          <View style={styles.center}>
            <Ionicons name="sad-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>{t.noUsersFound}</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={searchRows}
          keyExtractor={(item) => item.key}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      );
    }

    // Arama yok: takip edilenleri öneri olarak göster.
    if (suggestionsQuery.isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (suggestionRows.length === 0) {
      return (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            {t.startTypingToSearch}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={suggestionRows}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t.suggested}</Text>
        }
      />
    );
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={t.newMessage}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t.searchUsers}
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={handleQueryChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={() => handleQueryChange('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ height: bodyHeight }}>{renderBody()}</View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
  },
  hintText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  userText: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  userSubtitle: {
    fontSize: FontSize.sm,
  },
});
