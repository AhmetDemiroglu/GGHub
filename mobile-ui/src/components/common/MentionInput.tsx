import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputSelectionChangeEventData,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { useTheme } from '@/src/hooks/use-theme';
import { useAuth } from '@/src/hooks/use-auth';
import { searchMentionableUsers } from '@/src/api/search';
import { displayName } from '@/src/utils/display-name';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

const DEBOUNCE_MS = 250;

/**
 * Imlecin solundaki aktif "@sorgu"yu bulur. MentionText'teki regex ile ayni
 * kapiyi uygular: "@"in solunda ad karakteri varsa (or. "a@b") bahis degildir.
 * Bulunamazsa null doner.
 */
function findActiveMentionQuery(
  text: string,
  caret: number,
): { query: string; start: number } | null {
  const upToCaret = text.slice(0, caret);
  const at = upToCaret.lastIndexOf('@');
  if (at === -1) return null;

  const before = at > 0 ? upToCaret[at - 1] : '';
  // Satir basi degilse, "@"in solundaki karakter ad karakteri OLMAMALI.
  if (before && /[\p{L}\p{N}_.]/u.test(before)) return null;

  const query = upToCaret.slice(at + 1);
  // Handle alfabesi disinda bir sey (bosluk dahil) varsa bahis yazimi bitmistir.
  if (query.length === 0 || query.length > 30) return null;
  if (!/^[\p{L}\p{N}_.]+$/u.test(query)) return null;

  return { query, start: at };
}

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  numberOfLines?: number;
  editable?: boolean;
  autoFocus?: boolean;
  /** TextInput'un kendi stili. */
  style?: StyleProp<TextStyle>;
  /** Oneri seridi + input'u saran dis kap. */
  containerStyle?: StyleProp<ViewStyle>;
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
}

/**
 * "@" tetikleyicili TextInput.
 *
 * Oneriler input'un USTUNDE yatay bir serit olarak cizilir (klavye aksesuari
 * tarzi), mutlak konumlu bir dropdown olarak DEGIL: FlatList icinde yasayan bir
 * formda dropdown hem klavyeyle hem listenin kaydirmasiyla kavga eder ve z-index
 * savasi bu isin degmez.
 */
export function MentionInput({
  value,
  onChangeText,
  placeholder,
  multiline = true,
  maxLength,
  numberOfLines,
  editable = true,
  autoFocus,
  style,
  containerStyle,
  textAlignVertical,
}: MentionInputProps) {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();

  // Imlec yalnizca OKUNUR: TextInput'a `selection` GERI VERILMEZ. Kontrollu
  // selection, Android'de yazarken imleci basa firlatan bilindik hataya yol acar.
  // Bahis eklerken imlec metnin sonuna gider; bahisler pratikte metnin sonuna
  // yazildigi icin bu dogru davranistir.
  const [caret, setCaret] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const active = useMemo(
    () => (editable ? findActiveMentionQuery(value, caret) : null),
    [value, caret, editable],
  );
  const rawQuery = active?.query ?? '';

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const suggestionsQuery = useQuery({
    queryKey: ['mentionSuggestions', debouncedQuery],
    queryFn: () => searchMentionableUsers(debouncedQuery),
    // Endpoint [Authorize]: anonim cagri 401 doner, hic denemeyelim.
    enabled: isAuthenticated && debouncedQuery.length > 0,
    staleTime: 30000,
  });

  const suggestions =
    active && debouncedQuery === rawQuery ? (suggestionsQuery.data ?? []) : [];

  const handleSelect = useCallback(
    (username: string) => {
      if (!active) return;
      const before = value.slice(0, active.start);
      const after = value.slice(active.start + 1 + active.query.length);
      // Ardindan bosluk gelmiyorsa HER ZAMAN bosluk ekle. Bu, handle'in sonraki
      // metne yapismasini engeller: "@ahmet"+"bc" -> "@ahmetbc" bambaska bir
      // handle olurdu, "@ahmet"+"." ise "@ahmet." olarak COZULEMEYEN bir handle'a
      // giderdi (backend de "." karakterini handle'in parcasi sayar).
      //
      // Noktalamayi ("@ahmet!") istisna tutmak daha guzel gorunur ama imleci
      // handle'in hemen sonunda birakir; orada aktif sorgu hala "ahmet" okunur ve
      // az once secilen kisi icin oneri seridi TEKRAR acilir. Bu yuzden bilerek
      // "her zaman ayir" kurali secildi: nadiren "@ahmet !" gibi fazladan bir
      // bosluk cikar, ama yanlis handle da olusmaz, serit de acik kalmaz.
      const separator = after.startsWith(' ') ? '' : ' ';
      onChangeText(`${before}@${username}${separator}${after}`);
      // Imleci bosluktan SONRAYA tasi (bosluk yeni eklendiyse de, zaten vardiysa da
      // ayni konum). Boslugun onunde birakilirsa aktif sorgu hala "@username" olarak
      // okunur ve az once secilen kisi icin oneri seridi tekrar acilirdi.
      setCaret(before.length + 1 + username.length + 1);
    },
    [active, value, onChangeText],
  );

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setCaret(event.nativeEvent.selection.start);
    },
    [],
  );

  return (
    <View style={containerStyle}>
      {suggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          style={[styles.strip, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.stripContent}
        >
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleSelect(item.username)}
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              ]}
            >
              <Avatar uri={item.profileImageUrl} name={displayName(item)} size={20} />
              <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                @{item.username}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <TextInput
        style={style}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        maxLength={maxLength}
        numberOfLines={numberOfLines}
        editable={editable}
        autoFocus={autoFocus}
        textAlignVertical={textAlignVertical}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    maxHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
  },
  stripContent: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    maxWidth: 180,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
});
