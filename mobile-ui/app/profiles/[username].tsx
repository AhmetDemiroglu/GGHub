import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { SegmentedTabs } from '@/src/components/common/SegmentedTabs';
import { ProfileHeader } from '@/src/components/profile/ProfileHeader';
import { FollowersModal } from '@/src/components/profile/FollowersModal';
import { GamerDnaChart } from '@/src/components/profile/GamerDnaChart';
import { ActivityFeedList } from '@/src/components/profile/ActivityFeedList';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getProfileByUsername } from '@/src/api/profile';
import { getUserStats } from '@/src/api/stats';
import { followUser, unfollowUser, blockUser, unblockUser } from '@/src/api/social';
import { useRequireAuth } from '@/src/contexts/auth-prompt-context';
import { reportUser } from '@/src/api/report';
import { getReviewsByUser } from '@/src/api/review';
import { getListsByUsername } from '@/src/api/list';
import { getUserActivityFeed } from '@/src/api/activity';
import { getImageUrl } from '@/src/utils/image';
import { ProfileVisibilitySetting } from '@/src/models/profile';
import * as haptics from '@/src/utils/haptics';
import type { Review } from '@/src/models/review';
import type { UserList } from '@/src/models/list';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

type ProfileTab = 'overview' | 'reviews' | 'lists';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const h = messages.profile.header;
  const rp = messages.report.dialog;
  const af = messages.profile.activityFeed;
  const requireAuth = useRequireAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [followersModal, setFollowersModal] = useState<'followers' | 'following' | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const profileQuery = useQuery({
    queryKey: ['publicProfile', username],
    queryFn: () => getProfileByUsername(username!),
    enabled: !!username,
  });

  const statsQuery = useQuery({
    queryKey: ['userStats', username],
    queryFn: () => getUserStats(username!),
    enabled: !!username,
  });

  const reviewsQuery = useQuery({
    queryKey: ['userReviews', username],
    queryFn: () => getReviewsByUser(username!),
    enabled: !!username && activeTab === 'reviews',
  });

  const listsQuery = useQuery({
    queryKey: ['userLists', username],
    queryFn: () => getListsByUsername(username!),
    enabled: !!username && activeTab === 'lists',
  });

  const activityQuery = useQuery({
    queryKey: ['userActivity', username],
    queryFn: () => getUserActivityFeed(username!),
    enabled: !!username && activeTab === 'overview',
  });

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  const followMutation = useMutation({
    mutationFn: () => (profile?.isFollowing ? unfollowUser(username!) : followUser(username!)),
    onSuccess: () => {
      if (profile?.isFollowing) {
        haptics.impactLight();
      } else {
        haptics.success();
      }
      queryClient.invalidateQueries({ queryKey: ['publicProfile', username] });
      queryClient.invalidateQueries({ queryKey: ['userStats', username] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => (profile?.isBlockedByMe ? unblockUser(username!) : blockUser(username!)),
    onSuccess: () => {
      haptics.impactHeavy();
      queryClient.invalidateQueries({ queryKey: ['publicProfile', username] });
      setMenuVisible(false);
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => reportUser(profile?.id ?? 0, { reason: reportReason }),
    onSuccess: () => {
      haptics.success();
      showToast('success', rp.success);
      setReportVisible(false);
      setReportReason('');
    },
  });

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    statsQuery.refetch();
    if (activeTab === 'overview') activityQuery.refetch();
    if (activeTab === 'reviews') reviewsQuery.refetch();
    if (activeTab === 'lists') listsQuery.refetch();
  }, [activeTab, activityQuery, listsQuery, profileQuery, reviewsQuery, statsQuery]);

  if (profileQuery.isLoading) return <LoadingScreen />;

  if (!profile) {
    return (
      <ScreenWrapper swipeBackEnabled={false}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          {messages.common.genericError}
        </Text>
      </ScreenWrapper>
    );
  }

  const isBlockedByThem = profile.isBlockingMe;
  const isBlockedByMe = profile.isBlockedByMe;
  const isPrivate =
    profile.profileVisibility === ProfileVisibilitySetting.Private && !profile.isFollowing;
  const isMe = user?.username === username;

  if (isBlockedByThem) {
    return (
      <ScreenWrapper noPadding safeArea={false} swipeBackEnabled={false}>
        <ScreenHeader title={`@${username}`} />
        <View style={styles.blockedContainer}>
          <Ionicons name="ban-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.blockedText, { color: colors.textMuted }]}>{h.blockedByThemTitle}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const renderReview = (item: Review, index: number) => {
    const goToGame = () => {
      if (item.game?.slug) router.push(`/game/${item.game.slug}`);
    };
    return (
      <TouchableOpacity
        key={`${item.id}-${index}`}
        onPress={goToGame}
        activeOpacity={0.7}
        disabled={!item.game?.slug}
      >
        <Card style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            {getImageUrl(item.game?.coverImage ?? item.game?.backgroundImage) ? (
              <Image
                source={{ uri: getImageUrl(item.game?.coverImage ?? item.game?.backgroundImage)! }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImageFallback, { backgroundColor: colors.surfaceHighlight }]}>
                <Ionicons name="game-controller-outline" size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.cardBody}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewGame, { color: colors.text }]} numberOfLines={1}>
                  {item.game?.name}
                </Text>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color={colors.star} />
                  <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating}/10</Text>
                </View>
              </View>
              <Text style={[styles.reviewText, { color: colors.textSecondary }]} numberOfLines={3}>
                {item.content}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderList = ({ item, index }: { item: UserList; index: number }) => {
    const listImage = getImageUrl(item.previewGames?.[0]?.coverImage ?? item.firstGameImageUrls?.[0]);

    return (
      <TouchableOpacity
        key={`${item.id}-${index}`}
        onPress={() => router.push(`/lists/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={styles.listCard}>
          <View style={styles.listRow}>
            {listImage ? (
              <Image source={{ uri: listImage }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.cardImageFallback, { backgroundColor: colors.surfaceHighlight }]}>
                <Ionicons name="list-outline" size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={[styles.listDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
                {item.gameCount} {af.gamesLabel} · {item.followerCount} {h.followersLabel}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper noPadding safeArea={false} swipeBackEnabled={false}>
      <ScreenHeader
        title={`@${username}`}
        rightExtra={
          !isMe ? (
            <TouchableOpacity
              onPress={() => requireAuth(() => setMenuVisible(true))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
        refreshControl={
          <RefreshControl refreshing={profileQuery.isRefetching} onRefresh={onRefresh} />
        }
      >
        <ProfileHeader
          username={profile.username}
          firstName={profile.firstName}
          lastName={profile.lastName}
          bio={profile.bio}
          status={profile.status}
          avatarUrl={profile.profileImageUrl}
          headerImageUrl={profile.headerImageUrl}
          createdAt={profile.createdAt}
          level={stats?.currentLevel ?? 1}
          xp={stats?.currentXp ?? 0}
          xpToNextLevel={stats?.nextLevelXp ?? 100}
          followersCount={profile.followerCount ?? stats?.totalFollowers ?? 0}
          followingCount={profile.followingCount ?? 0}
          onFollowersPress={() => setFollowersModal('followers')}
          onFollowingPress={() => setFollowersModal('following')}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.text }]}>
                {profile.reviewCount ?? stats?.totalReviews ?? 0}
              </Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>
                {messages.home.activityTabs.reviews}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.text }]}>
                {profile.listCount ?? stats?.totalLists ?? 0}
              </Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>
                {messages.home.activityTabs.lists}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.text }]}>
                {stats?.totalGamesListed ?? 0}
              </Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>
                {af.gamesLabel}
              </Text>
            </View>
          </View>

          {!isMe ? (
            <View style={styles.actionRow}>
              <Button
                title={profile.isFollowing ? h.unfollow : h.follow}
                variant={profile.isFollowing ? 'outline' : 'primary'}
                onPress={() => requireAuth(() => {
                  followMutation.mutate();
                })}
                loading={followMutation.isPending}
                style={styles.actionBtn}
              />
              {profile.messageSetting !== 2 ? (
                <Button
                  title={h.messageOpen}
                  variant="secondary"
                  onPress={() => requireAuth(() => router.push(`/(tabs)/messages/${username}`))}
                  style={styles.actionBtn}
                  icon={<Ionicons name="chatbubble-outline" size={16} color={colors.text} />}
                />
              ) : null}
            </View>
          ) : null}
        </ProfileHeader>

        {isPrivate ? (
          <View style={styles.privateContainer}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.privateTitle, { color: colors.text }]}>{messages.profile.followersModal.hiddenProfile}</Text>
            <Text style={[styles.privateDesc, { color: colors.textSecondary }]}>
              {messages.profile.followersModal.hiddenProfileDescription}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tabsRow}>
              <SegmentedTabs
                tabs={[
                  { key: 'overview' as const, label: messages.home.activityTitle },
                  { key: 'reviews' as const, label: messages.home.activityTabs.reviews },
                  { key: 'lists' as const, label: messages.home.activityTabs.lists },
                ]}
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k)}
              />
            </View>

            <View style={styles.tabContent}>
              {activeTab === 'overview' ? (
                <>
                  <GamerDnaChart data={statsQuery.data?.gamerDna ?? []} username={username} />
                  <View style={styles.sectionGap} />
                  <ActivityFeedList activities={activityQuery.data ?? []} />
                </>
              ) : null}

              {activeTab === 'reviews' ? (
                reviewsQuery.data && reviewsQuery.data.length > 0 ? (
                  reviewsQuery.data.map((r, i) => renderReview(r, i))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {messages.reviewList.emptyTitle}
                  </Text>
                )
              ) : null}

              {activeTab === 'lists' ? (
                <FlatList
                  data={listsQuery.data ?? []}
                  renderItem={renderList}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
                  ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {messages.lists.noListsForCriteria}
                    </Text>
                  }
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {followersModal ? (
        <FollowersModal
          visible
          onClose={() => setFollowersModal(null)}
          username={username!}
          initialTab={followersModal}
        />
      ) : null}

      <BottomSheet visible={menuVisible} onClose={() => setMenuVisible(false)} title={messages.common.edit}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => blockMutation.mutate()}
        >
          <Ionicons
            name={isBlockedByMe ? 'checkmark-circle-outline' : 'ban-outline'}
            size={22}
            color={colors.error}
          />
          <Text style={[styles.menuItemText, { color: colors.error }]}>
            {isBlockedByMe ? h.unblockTooltip : h.blockTooltip}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => {
            setMenuVisible(false);
            setReportVisible(true);
          }}
        >
          <Ionicons name="flag-outline" size={22} color={colors.warning} />
          <Text style={[styles.menuItemText, { color: colors.warning }]}>{rp.title.user}</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        title={rp.title.user}
      >
        <TextInput
          style={[
            styles.reportInput,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            },
          ]}
          placeholder={rp.reasonPlaceholder}
          placeholderTextColor={colors.placeholder}
          value={reportReason}
          onChangeText={setReportReason}
          multiline
          numberOfLines={4}
        />
        <Button
          title={messages.common.submit}
          variant="danger"
          onPress={() => reportMutation.mutate()}
          loading={reportMutation.isPending}
          disabled={reportReason.trim().length < 10}
          fullWidth
          style={styles.reportBtn}
        />
      </BottomSheet>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.xl,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  blockedText: {
    fontSize: FontSize.md,
  },
  privateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  privateTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  privateDesc: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  tabsRow: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  reviewCard: {
    marginBottom: Spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewGame: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  reviewText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  listCard: {
    marginBottom: Spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardImage: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.md,
  },
  cardImageFallback: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: 6,
  },
  listMeta: {
    fontSize: FontSize.sm,
  },
  sectionGap: {
    height: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.xxxl,
  },
  errorText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.xxxl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  reportBtn: {
    marginTop: Spacing.sm,
  },
});
