import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { ProfileHeader } from '@/src/components/profile/ProfileHeader';
import { FollowersModal } from '@/src/components/profile/FollowersModal';
import { GamerDnaChart } from '@/src/components/profile/GamerDnaChart';
import { ActivityFeedList } from '@/src/components/profile/ActivityFeedList';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getProfileByUsername } from '@/src/api/profile';
import { getUserStats } from '@/src/api/stats';
import { followUser, unfollowUser, blockUser, unblockUser } from '@/src/api/social';
import { reportUser } from '@/src/api/report';
import { getReviewsByUser } from '@/src/api/review';
import { ProfileVisibilitySetting } from '@/src/models/profile';
import type { Review } from '@/src/models/review';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

type ProfileTab = 'overview' | 'reviews' | 'lists';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const h = messages.profile.header;
  const rp = messages.report.dialog;

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

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  const followMutation = useMutation({
    mutationFn: () => (profile?.isFollowing ? unfollowUser(username!) : followUser(username!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', username] });
      queryClient.invalidateQueries({ queryKey: ['userStats', username] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => (profile?.isBlockedByMe ? unblockUser(username!) : blockUser(username!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile', username] });
      setMenuVisible(false);
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => reportUser(profile?.id ?? 0, { reason: reportReason }),
    onSuccess: () => {
      Alert.alert('', rp.success);
      setReportVisible(false);
      setReportReason('');
    },
  });

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    statsQuery.refetch();
  }, [profileQuery, statsQuery]);

  if (profileQuery.isLoading) return <LoadingScreen />;

  if (!profile) {
    return (
      <ScreenWrapper>
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
      <ScreenWrapper>
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>@{username}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.blockedContainer}>
          <Ionicons name="ban-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.blockedText, { color: colors.textMuted }]}>{h.blockedByThemTitle}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const renderReview = (item: Review, index: number) => (
    <Card key={`${item.id}-${index}`} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={[styles.reviewGame, { color: colors.text }]}>{item.game?.name}</Text>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={colors.star} />
          <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating}/10</Text>
        </View>
      </View>
      <Text style={[styles.reviewText, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.content}
      </Text>
    </Card>
  );

  return (
    <ScreenWrapper noPadding>
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>@{username}</Text>
        {!isMe ? (
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <ScrollView
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
          createdAt={profile.createdAt}
          level={stats?.currentLevel ?? 1}
          xp={stats?.currentXp ?? 0}
          xpToNextLevel={stats?.nextLevelXp ?? 100}
          followersCount={profile.followerCount ?? stats?.totalFollowers ?? 0}
          followingCount={profile.followingCount ?? 0}
          onFollowersPress={() => setFollowersModal('followers')}
          onFollowingPress={() => setFollowersModal('following')}
        >
          {!isMe ? (
            <View style={styles.actionRow}>
              <Button
                title={profile.isFollowing ? h.unfollow : h.follow}
                variant={profile.isFollowing ? 'outline' : 'primary'}
                onPress={() => followMutation.mutate()}
                loading={followMutation.isPending}
                style={styles.actionBtn}
              />
              {profile.messageSetting !== 2 ? (
                <Button
                  title={h.messageOpen}
                  variant="secondary"
                  onPress={() => router.push(`/(tabs)/messages/${username}`)}
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
              {(['overview', 'reviews'] as ProfileTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: activeTab === tab ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {tab === 'overview' ? messages.home.activityTitle : messages.home.activityTabs.reviews}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tabContent}>
              {activeTab === 'overview' ? (
                <GamerDnaChart data={[]} />
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
    flexDirection: 'row',
    marginTop: Spacing.lg,
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
    padding: Spacing.lg,
  },
  reviewCard: {
    marginBottom: Spacing.md,
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
