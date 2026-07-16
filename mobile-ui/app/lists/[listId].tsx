import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Pressable,
  FlatList,
  type LayoutChangeEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { UserLinkAvatar, UserLinkName } from '@/src/components/common/UserLink';
import { Badge } from '@/src/components/common/Badge';
import { Button } from '@/src/components/common/Button';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { ListRating } from '@/src/components/lists/ListRating';
import { CommentSection } from '@/src/components/lists/CommentSection';
import { ListCommentComposer } from '@/src/components/lists/ListCommentComposer';
import { ListFormModal } from '@/src/components/lists/ListFormModal';
import { AddGameToListModal } from '@/src/components/lists/AddGameToListModal';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { useKeyboardDock } from '@/src/hooks/use-keyboard-dock';
import { getListDetail, followList, unfollowList, removeGameFromList } from '@/src/api/list';
import { useRequireAuth } from '@/src/contexts/auth-prompt-context';
import { getImageUrl } from '@/src/utils/image';
import { ListCategory } from '@/src/models/list';
import type { Game } from '@/src/models/game';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

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

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const scrollRef = useRef<ScrollView>(null);
  const commentsOffsetRef = useRef(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);

  const numericId = Number(listId);

  // Bu ekran tabs grubunda: tab bar HER ZAMAN gorunur ve icerigin uzerine biner
  // (AppTabBar position:'absolute'). Klavye kapaliyken kutu tab bar'in hemen
  // ustunde dinlenir, acilinca klavyenin tam ustune oturur.
  const dockStyle = useKeyboardDock(tabBarHeight);

  // Yorum bolumunun kayan icerik icindeki dikey konumu. Gonderim sonrasi oraya
  // kaydirmak icin: sunucu yeni yorumu listenin BASINA koyuyor
  // (UserListCommentService: OrderByDescending(CreatedAt)) ve kutu altta sabit
  // oldugu icin kullanici yoksa hicbir sey olmamis saniyor.
  const handleCommentsLayout = useCallback((event: LayoutChangeEvent) => {
    commentsOffsetRef.current = event.nativeEvent.layout.y;
  }, []);

  const scrollToComments = useCallback(() => {
    scrollRef.current?.scrollTo({ y: commentsOffsetRef.current, animated: true });
  }, []);

  const {
    data: list,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['listDetail', numericId],
    queryFn: () => getListDetail(numericId),
    enabled: !isNaN(numericId),
  });

  const followMutation = useMutation({
    mutationFn: () => followList(numericId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', numericId] });
      showToast(
        'success',
        messages.listDetail.followSuccess.replace(
          '{name}',
          list?.name ?? messages.listDetail.fallbackListName,
        ),
      );
    },
    onError: () => {
      showToast('error', messages.listDetail.followError);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowList(numericId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', numericId] });
      showToast(
        'success',
        messages.listDetail.unfollowSuccess.replace(
          '{name}',
          list?.name ?? messages.listDetail.fallbackListName,
        ),
      );
    },
    onError: () => {
      showToast('error', messages.listDetail.unfollowError);
    },
  });

  const removeGameMutation = useMutation({
    mutationFn: (gameId: number) => removeGameFromList(numericId, gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', numericId] });
      queryClient.invalidateQueries({ queryKey: ['myLists'] });
    },
    onError: () => {
      showToast('error', messages.common?.genericError ?? 'Error');
    },
  });

  const handleFollowToggle = () => {
    requireAuth(() => {
      if (list?.isFollowing) {
        unfollowMutation.mutate();
      } else {
        followMutation.mutate();
      }
    });
  };

  const isOwner = user && list && Number(user.id) === list.owner.id;

  if (isLoading) return <LoadingScreen />;

  if (isError || !list) {
    return (
      <ScreenWrapper>
        <EmptyState icon="alert-circle-outline" title={messages.listDetail.notFound} />
      </ScreenWrapper>
    );
  }

  const categoryKey = categoryKeyMap[list.category] as keyof typeof messages.lists.categories;

  const renderGameItem = ({ item }: { item: Game }) => {
    const imageUrl = getImageUrl(item.coverImage ?? item.backgroundImage);
    return (
      <Pressable
        style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/game/${item.slug}`)}
      >
        <View style={[styles.gameCover, { backgroundColor: colors.surfaceHighlight }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.gameCoverImage} resizeMode="cover" />
          ) : (
            <Ionicons name="game-controller-outline" size={24} color={colors.textMuted} />
          )}
          {isOwner ? (
            <Pressable
              style={styles.removeBadge}
              onPress={(e) => {
                e.stopPropagation();
                // Backend rawgId bekler (RemoveGameFromListAsync: g.RawgId == gameId);
                // internal item.id gonderilince oyun bulunamiyor ve 404 donuyordu.
                removeGameMutation.mutate(item.rawgId);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={16} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={list.name || messages.nav.screenTitles.listDetail} />
      {/*
        Kayan icerik ve alta sabit yorum kutusu, paddingBottom'u klavyeyle
        birlikte UI thread'de akan TEK bir kabin icinde durur (useKeyboardDock):
        kutu klavyenin tam ustune oturur, icerik alani da o kadar kisalir.

        keyboardShouldPersistTaps olmadan dis ScrollView ilk dokunusu "klavyeyi
        kapat" diye yutuyordu: bahis cipi, gonder, yanitla, oy ve sil ilk
        dokunusta calismiyordu.
      */}
      <Animated.View style={[styles.flex, dockStyle]}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.listName, { color: colors.text }]}>{list.name}</Text>
            <Badge label={messages.lists.categories[categoryKey]} />
          </View>

          {list.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {list.description}
            </Text>
          ) : null}

          <View style={styles.ownerRow}>
            <UserLinkAvatar user={list.owner} size={36} />
            <UserLinkName
              user={list.owner}
              variant="handle"
              style={[styles.ownerName, { color: colors.text }]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="game-controller" size={16} color={colors.textMuted} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {list.games.length} {messages.lists.gamesCount}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="people" size={16} color={colors.textMuted} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {list.followerCount} {messages.lists.followersCount}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {isOwner ? (
              <>
                <Button
                  title={messages.listDetail.edit}
                  variant="outline"
                  size="sm"
                  onPress={() => setShowEditModal(true)}
                  icon={<Ionicons name="pencil-outline" size={16} color={colors.primary} />}
                />
                <Button
                  title={messages.listDetail.addGame}
                  variant="outline"
                  size="sm"
                  onPress={() => setShowAddGameModal(true)}
                  icon={<Ionicons name="add" size={16} color={colors.primary} />}
                />
              </>
            ) : (
              <>
                <Button
                  title={
                    list.isFollowing
                      ? messages.listDetail.unfollow
                      : messages.listDetail.follow
                  }
                  variant={list.isFollowing ? 'secondary' : 'primary'}
                  size="sm"
                  onPress={handleFollowToggle}
                  loading={followMutation.isPending || unfollowMutation.isPending}
                  icon={
                    <Ionicons
                      name={list.isFollowing ? 'heart-dislike-outline' : 'heart-outline'}
                      size={16}
                      color={list.isFollowing ? colors.text : '#ffffff'}
                    />
                  }
                />
                <Button
                  title={messages.listDetail.report}
                  variant="ghost"
                  size="sm"
                  onPress={() => {}}
                  icon={<Ionicons name="flag-outline" size={16} color={colors.primary} />}
                />
              </>
            )}
          </View>
        </View>

        <ListRating
          listId={numericId}
          averageRating={list.averageRating}
          ratingCount={list.ratingCount}
        />

        <View style={styles.gamesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {messages.listDetail.gamesTitle.replace('{count}', String(list.games.length))}
          </Text>
          {list.games.length === 0 ? (
            <View style={styles.emptyGamesWrap}>
              <Text style={[styles.emptyGames, { color: colors.textMuted }]}>
                {messages.listDetail.empty}
              </Text>
              {isOwner ? (
                <Button
                  title={messages.listDetail.addGame}
                  size="sm"
                  onPress={() => setShowAddGameModal(true)}
                />
              ) : null}
            </View>
          ) : (
            <FlatList
              data={list.games}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderGameItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gamesListContent}
              // Sahibi icin ilk karo: oyun ekleme girisi. Modal (arama + ekle/cikar)
              // zaten vardi ama onu acan hicbir tetikleyici yoktu; ozellik erisilemezdi.
              ListHeaderComponent={
                isOwner ? (
                  <Pressable
                    style={[styles.addGameTile, { borderColor: colors.border }]}
                    onPress={() => setShowAddGameModal(true)}
                  >
                    <View style={[styles.addGameIcon, { backgroundColor: colors.surfaceHighlight }]}>
                      <Ionicons name="add" size={26} color={colors.primary} />
                    </View>
                    <Text style={[styles.addGameLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                      {messages.listDetail.addGame}
                    </Text>
                  </Pressable>
                ) : null
              }
            />
          )}
        </View>

        <View onLayout={handleCommentsLayout}>
          <CommentSection listId={numericId} />
        </View>
        </ScrollView>

        <ListCommentComposer listId={numericId} onPosted={scrollToComments} />
      </Animated.View>

      {isOwner && list ? (
        <>
          <ListFormModal
            visible={showEditModal}
            onClose={() => setShowEditModal(false)}
            editingList={list as any}
          />
          <AddGameToListModal
            visible={showAddGameModal}
            onClose={() => setShowAddGameModal(false)}
            listId={numericId}
            currentGames={list.games}
          />
        </>
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    // Yorum kutusu kayan icerigin UZERINE binmez, ALTINDA kardes olarak durur;
    // burada sadece son yorumun kutunun ust cizgisine yapismamasi icin nefes
    // payi birakilir. Tab bar bosluguna kap zaten bakiyor.
    paddingBottom: Spacing.md,
  },
  headerSection: {
    padding: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  listName: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    flex: 1,
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ownerName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  gamesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  emptyGames: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyGamesWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  addGameTile: {
    width: 140,
    height: 180,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addGameIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGameLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  gamesListContent: {
    gap: Spacing.md,
  },
  gameCard: {
    width: 140,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gameCover: {
    width: 140,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCoverImage: {
    width: 140,
    height: 180,
  },
  gameName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    padding: Spacing.sm,
  },
  removeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
