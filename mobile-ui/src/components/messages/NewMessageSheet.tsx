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
import { searchMessageableUsers } from '@/src/api/search';
import { toMobileRoute } from '@/src/utils/route';
import type { SearchResult } from '@/src/models/search';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

interface NewMessageSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * X tarzı "yeni mesaj" akışı: alttan açılan sheet içinde kendi arama kutusu +
 * mesaj atılabilecek kullanıcı listesi. Backend (searchMessageableUsers) zaten
 * engellenen, mesaj kapalı ve takip-gerektiren gizlilik kurallarını uyguladığı
 * için burada ek bir kontrol gerekmez. Bir kullanıcıya basınca sheet kapanır ve
 * o kişinin sohbet ekranı açılır; kullanıcı mesaj atmadan da sheet'i kapatabilir.
 */
export function NewMessageSheet({ visible, onClose }: NewMessageSheetProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
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

  const { data, isLoading } = useQuery({
    queryKey: ['messageableUsers', debouncedQuery],
    queryFn: () => searchMessageableUsers(debouncedQuery),
    enabled: visible && debouncedQuery.length >= MIN_QUERY,
    staleTime: 15000,
  });

  const users = data ?? [];

  const handleClose = useCallback(() => {
    // Sheet tekrar açıldığında temiz gelsin diye arama state'ini sıfırla.
    setQuery('');
    setDebouncedQuery('');
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      handleClose();
      router.push(toMobileRoute(item.link) as any);
    },
    [handleClose, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <TouchableOpacity
        style={[styles.userRow, { borderBottomColor: colors.border }]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Avatar uri={item.imageUrl} name={item.title} size={44} />
        <View style={styles.userText}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text
              style={[styles.userSubtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    ),
    [colors, handleSelect],
  );

  const showPrompt = debouncedQuery.length < MIN_QUERY;
  const showEmpty =
    debouncedQuery.length >= MIN_QUERY && !isLoading && users.length === 0;

  // Liste alanına klavyenin üstünde sığacak makul bir yükseklik ver. FlatList
  // sınırlı yükseklik olmadan sheet içinde 0 px'e çöker.
  const bodyHeight = Math.round(height * 0.42);

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

      <View style={{ height: bodyHeight }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : showPrompt ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              {t.startTypingToSearch}
            </Text>
          </View>
        ) : showEmpty ? (
          <View style={styles.center}>
            <Ionicons name="sad-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              {t.noUsersFound}
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>
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
