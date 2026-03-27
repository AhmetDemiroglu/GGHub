import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import { Button } from '@/src/components/common/Button';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { ListRating } from '@/src/components/lists/ListRating';
import { CommentSection } from '@/src/components/lists/CommentSection';
import { ListFormModal } from '@/src/components/lists/ListFormModal';
import { AddGameToListModal } from '@/src/components/lists/AddGameToListModal';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getListDetail, followList, unfollowList } from '@/src/api/list';
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
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);

  const numericId = Number(listId);

  const {
    data: list,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['listDetail', numericId],
    queryFn: () => getListDetail(numericId),
    enabled: !isNaN(numericId),
  });

  const followMutation = useMutation({
    mutationFn: () => followList(numericId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', numericId] });
      showToast('success', messages.listDetail.followSuccess);
    },
    onError: () => {
      showToast('error', messages.listDetail.followError);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowList(numericId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listDetail', numericId] });
      showToast('success', messages.listDetail.unfollowSuccess);
    },
    onError: () => {
      showToast('error', messages.listDetail.unfollowError);
    },
  });

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      showToast('info', messages.listDetail.loginRequiredToFollow);
      return;
    }
    if (list?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
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
        onPress={() => router.push(`/games/${item.slug}`)}
      >
        <View style={[styles.gameCover, { backgroundColor: colors.surfaceHighlight }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.gameCoverImage} resizeMode="cover" />
          ) : (
            <Ionicons name="game-controller-outline" size={24} color={colors.textMuted} />
          )}
        </View>
        <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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

          <Pressable style={styles.ownerRow}>
            <Avatar
              uri={list.owner.profileImageUrl}
              name={list.owner.username}
              size={36}
            />
            <View>
              <Text style={[styles.ownerName, { color: colors.text }]}>
                @{list.owner.username}
              </Text>
            </View>
          </Pressable>

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
            <Text style={[styles.emptyGames, { color: colors.textMuted }]}>
              {messages.listDetail.empty}
            </Text>
          ) : (
            <FlatList
              data={list.games}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderGameItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gamesListContent}
            />
          )}
        </View>

        <CommentSection listId={numericId} />
      </ScrollView>

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
  scrollContent: {
    paddingBottom: Spacing.xxxl,
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
});
