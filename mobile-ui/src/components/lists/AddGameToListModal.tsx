import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
// Arama alani ustte oldugu icin klavye onu ortmuyordu, ama sonuc listesi
// Android'de klavyenin ARKASINA uzaniyordu. Bu, listeyi klavyenin ustune sigdirir.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { gameApi } from '@/src/api/game';
import { addGameToList, removeGameFromList } from '@/src/api/list';
import { getImageUrl } from '@/src/utils/image';
import * as haptics from '@/src/utils/haptics';
import type { Game } from '@/src/models/game';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface AddGameToListModalProps {
  visible: boolean;
  onClose: () => void;
  listId: number;
  currentGames: Game[];
}

export function AddGameToListModal({
  visible,
  onClose,
  listId,
  currentGames,
}: AddGameToListModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['gameSearch', debouncedSearch],
    queryFn: () =>
      gameApi.paginate({ page: 1, pageSize: 20, search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  // İyimser durum: ikon DOKUNUR DOKUNMAZ döner; sunucu yanıtı + listDetail
  // refetch'i arkadan gelir. Eskiden ikon ancak invalidate -> refetch ->
  // parent prop güncellemesi zincirinden sonra değişiyordu; yavaş ağda
  // buton "basmıyor" hissi verip art arda dokunmaya yol açıyordu.
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const pendingIdsRef = useRef<Set<number>>(new Set());

  const currentGameRawgIds = useMemo(
    () => new Set(currentGames.map((game) => game.rawgId)),
    [currentGames],
  );

  const setOverride = useCallback((rawgId: number, inList: boolean) => {
    setOverrides((prev) => new Map(prev).set(rawgId, inList));
  }, []);

  const setPending = useCallback((rawgId: number, pending: boolean) => {
    if (pending) pendingIdsRef.current.add(rawgId);
    else pendingIdsRef.current.delete(rawgId);

    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(rawgId);
      else next.delete(rawgId);
      return next;
    });
  }, []);

  // Parent'taki liste yeni sunucu durumunu aldığında artık gereksiz kalan
  // override'ları temizle. Böylece modal açık kaldığında da yerel durum birikmez.
  useEffect(() => {
    setOverrides((prev) => {
      const next = new Map(prev);
      let changed = false;

      next.forEach((inList, rawgId) => {
        if (currentGameRawgIds.has(rawgId) === inList) {
          next.delete(rawgId);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [currentGameRawgIds]);

  const { mutate: mutateAdd } = useMutation({
    mutationFn: (rawgId: number) => addGameToList(listId, rawgId),
    onSuccess: async () => {
      showToast('success', messages.listDetail.gameAdded);
      // Butonu refetch tamamlanana kadar kilitli tut; ağ hızlıysa art arda gelen
      // sonraki dokunuşun yeni görünen eksi butonunu tetiklemesini de önler.
      await queryClient
        .invalidateQueries({ queryKey: ['listDetail', listId] })
        .catch(() => undefined);
    },
    onError: (_e, rawgId) => {
      setOverride(rawgId, false);
      showToast('error', messages.common.genericError);
    },
    onSettled: (_d, _e, rawgId) => setPending(rawgId, false),
  });

  const { mutate: mutateRemove } = useMutation({
    mutationFn: (rawgId: number) => removeGameFromList(listId, rawgId),
    onSuccess: async () => {
      showToast('success', messages.listDetail.gameRemoved);
      await queryClient
        .invalidateQueries({ queryKey: ['listDetail', listId] })
        .catch(() => undefined);
    },
    onError: (_e, rawgId) => {
      setOverride(rawgId, true);
      showToast('error', messages.common.genericError);
    },
    onSettled: (_d, _e, rawgId) => setPending(rawgId, false),
  });

  // Ref, React yeniden render etmeden önce gelen ikinci dokunuşu da engeller.
  const handleAdd = useCallback((rawgId: number) => {
    if (pendingIdsRef.current.has(rawgId)) return;
    setPending(rawgId, true);
    setOverride(rawgId, true);
    haptics.impactLight();
    mutateAdd(rawgId);
  }, [mutateAdd, setOverride, setPending]);

  const handleRemove = useCallback((rawgId: number) => {
    if (pendingIdsRef.current.has(rawgId)) return;
    setPending(rawgId, true);
    setOverride(rawgId, false);
    haptics.impactLight();
    mutateRemove(rawgId);
  }, [mutateRemove, setOverride, setPending]);

  const renderSearchResult = useCallback(
    ({ item }: { item: Game }) => {
      // İyimser override sunucu durumunu geçersiz kılar (anlık ikon dönüşü).
      const isInList = overrides.get(item.rawgId) ?? currentGameRawgIds.has(item.rawgId);
      const isPending = pendingIds.has(item.rawgId);
      const imageUrl = getImageUrl(item.coverImage ?? item.backgroundImage);
      return (
        <View style={[styles.gameRow, { borderBottomColor: colors.border }]}>
          <View
            style={[
              styles.gameCover,
              { backgroundColor: colors.surfaceHighlight },
            ]}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.gameCoverImage} />
            ) : (
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={colors.textMuted}
              />
            )}
          </View>
          <Text
            style={[styles.gameName, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {isInList ? (
            <Pressable
              // Backend rawgId bekler (GetOrCreateGameByRawgId); internal id
              // gonderilirse yanlis oyuna islem yapilabilir.
              onPress={() => handleRemove(item.rawgId)}
              disabled={isPending}
              hitSlop={10}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.error + '20',
                  opacity: isPending ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name="remove-circle-outline"
                size={20}
                color={colors.error}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => handleAdd(item.rawgId)}
              disabled={isPending}
              hitSlop={10}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.success + '20',
                  opacity: isPending ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.success}
              />
            </Pressable>
          )}
        </View>
      );
    },
    [
      colors,
      currentGameRawgIds,
      handleAdd,
      handleRemove,
      overrides,
      pendingIds,
    ],
  );

  const renderCurrentGame = useCallback(
    ({ item }: { item: Game }) => {
      const imageUrl = getImageUrl(item.coverImage ?? item.backgroundImage);
      const isPending = pendingIds.has(item.rawgId);
      return (
        <View style={[styles.gameRow, { borderBottomColor: colors.border }]}>
          <View
            style={[
              styles.gameCover,
              { backgroundColor: colors.surfaceHighlight },
            ]}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.gameCoverImage} />
            ) : (
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={colors.textMuted}
              />
            )}
          </View>
          <Text
            style={[styles.gameName, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Pressable
            onPress={() => handleRemove(item.rawgId)}
            disabled={isPending}
            hitSlop={10}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.error + '20',
                opacity: isPending ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      );
    },
    [colors, handleRemove, pendingIds],
  );

  const searchItems = searchResults?.items ?? [];
  const visibleCurrentGames = currentGames.filter(
    (game) => overrides.get(game.rawgId) !== false,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior="padding"
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {messages.listDetail.addGame}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={messages.listDetail.searchGames}
            placeholderTextColor={colors.placeholder}
            value={searchTerm}
            onChangeText={handleSearchChange}
            autoFocus
          />
        </View>

        {debouncedSearch.length >= 2 ? (
          isSearching ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.loader}
            />
          ) : searchItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {messages.listDetail.noGamesFound}
            </Text>
          ) : (
            <FlatList
              data={searchItems}
              keyExtractor={(item) => String(item.rawgId)}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          )
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {messages.listDetail.currentGames} ({visibleCurrentGames.length})
            </Text>
            <FlatList
              data={visibleCurrentGames}
              keyExtractor={(item) => String(item.rawgId)}
              renderItem={renderCurrentGame}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {messages.listDetail.empty}
                </Text>
              }
            />
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md },
  loader: { marginTop: Spacing.xxl },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.md,
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  listContent: { paddingHorizontal: Spacing.lg },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  gameCover: {
    width: 48,
    height: 64,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gameCoverImage: { width: 48, height: 64 },
  gameName: { flex: 1, fontSize: FontSize.md, fontWeight: '500' },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
