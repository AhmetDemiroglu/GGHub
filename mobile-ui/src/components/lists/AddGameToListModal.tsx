import React, { useState, useCallback, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { gameApi } from '@/src/api/game';
import { addGameToList, removeGameFromList } from '@/src/api/list';
import { getImageUrl } from '@/src/utils/image';
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

  const addMutation = useMutation({
    mutationFn: (gameId: number) => addGameToList(listId, gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', listId] });
      showToast('success', messages.listDetail.gameAdded);
    },
    onError: () => {
      showToast('error', messages.common.genericError);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (gameId: number) => removeGameFromList(listId, gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', listId] });
      showToast('success', messages.listDetail.gameRemoved);
    },
    onError: () => {
      showToast('error', messages.common.genericError);
    },
  });

  // rawgId: her zaman mevcut ve benzersiz; id=0 edge case'ine karşı güvenli
  const currentGameRawgIds = new Set(currentGames.map((g) => g.rawgId));

  const renderSearchResult = useCallback(
    ({ item }: { item: Game }) => {
      const isInList = currentGameRawgIds.has(item.rawgId);
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
              onPress={() => removeMutation.mutate(item.id)}
              style={[
                styles.actionButton,
                { backgroundColor: colors.error + '20' },
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
              onPress={() => addMutation.mutate(item.id)}
              style={[
                styles.actionButton,
                { backgroundColor: colors.success + '20' },
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
    [currentGameRawgIds, colors, addMutation, removeMutation],
  );

  const renderCurrentGame = useCallback(
    ({ item }: { item: Game }) => {
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
          <Pressable
            onPress={() => removeMutation.mutate(item.id)}
            style={[
              styles.actionButton,
              { backgroundColor: colors.error + '20' },
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>
      );
    },
    [colors, removeMutation],
  );

  const searchItems = searchResults?.items ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            />
          )
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {messages.listDetail.currentGames} ({currentGames.length})
            </Text>
            <FlatList
              data={currentGames}
              keyExtractor={(item) => String(item.rawgId)}
              renderItem={renderCurrentGame}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {messages.listDetail.empty}
                </Text>
              }
            />
          </>
        )}
      </View>
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
