import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { AppTopBar } from '@/src/components/shell';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { Card } from '@/src/components/common/Card';
import { ProfileHeader } from '@/src/components/profile/ProfileHeader';
import { FollowersModal } from '@/src/components/profile/FollowersModal';
import { GamerDnaChart } from '@/src/components/profile/GamerDnaChart';
import { ActivityFeedList } from '@/src/components/profile/ActivityFeedList';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getMyProfile } from '@/src/api/profile';
import { getUserStats } from '@/src/api/stats';
import { getReviewsByUser } from '@/src/api/review';
import { getMyLists } from '@/src/api/list';
import { getPersonalizedFeed } from '@/src/api/activity';
import type { Review } from '@/src/models/review';
import type { UserList } from '@/src/models/list';
import { Spacing, FontSize } from '@/src/constants/theme';

type ProfileTab = 'overview' | 'reviews' | 'lists';

export default function OwnProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const h = messages.profile.header;
  const af = messages.profile.activityFeed;

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [followersModal, setFollowersModal] = useState<'followers' | 'following' | null>(null);

  const username = user?.username ?? '';

  const profileQuery = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    enabled: !!username,
  });

  const statsQuery = useQuery({
    queryKey: ['userStats', username],
    queryFn: () => getUserStats(username),
    enabled: !!username,
  });

  const reviewsQuery = useQuery({
    queryKey: ['userReviews', username],
    queryFn: () => getReviewsByUser(username),
    enabled: !!username && activeTab === 'reviews',
  });

  const listsQuery = useQuery({
    queryKey: ['myLists'],
    queryFn: () => getMyLists(),
    enabled: !!username && activeTab === 'lists',
  });

  const activityQuery = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => getPersonalizedFeed(10),
    enabled: !!username && activeTab === 'overview',
  });

  const profile = profileQuery.data;
  const stats = statsQuery.data;

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
    statsQuery.refetch();
  }, [profileQuery, statsQuery]);

  if (profileQuery.isLoading) return <LoadingScreen />;

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'overview', label: messages.home.activityTitle },
    { key: 'reviews', label: messages.home.activityTabs.reviews },
    { key: 'lists', label: messages.home.activityTabs.lists },
  ];

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

  const renderList = (item: UserList, index: number) => (
    <Card key={`${item.id}-${index}`} style={styles.listCard}>
      <Text style={[styles.listName, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
        {item.gameCount} {af.gamesLabel} · {item.followerCount} {h.followersLabel}
      </Text>
    </Card>
  );

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <AppTopBar title={messages.nav.profile} />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={profileQuery.isRefetching} onRefresh={onRefresh} />
        }
      >
        {profile ? (
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
            followersCount={stats?.totalFollowers ?? 0}
            followingCount={0}
            onFollowersPress={() => setFollowersModal('followers')}
            onFollowingPress={() => setFollowersModal('following')}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {stats?.totalReviews ?? 0}
                </Text>
                <Text style={[styles.statLbl, { color: colors.textSecondary }]}>
                  {messages.home.activityTabs.reviews}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.text }]}>
                  {stats?.totalLists ?? 0}
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
          </ProfileHeader>
        ) : null}

        <View style={styles.tabsRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'overview' ? (
            <>
              <GamerDnaChart data={[]} />
              <View style={styles.sectionGap} />
              <ActivityFeedList activities={activityQuery.data ?? []} />
            </>
          ) : null}

          {activeTab === 'reviews' ? (
            reviewsQuery.data && reviewsQuery.data.length > 0 ? (
              reviewsQuery.data.map((r, i) => renderReview(r, i))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{messages.reviewList.emptyTitle}</Text>
            )
          ) : null}

          {activeTab === 'lists' ? (
            listsQuery.data && listsQuery.data.length > 0 ? (
              listsQuery.data.map((l, i) => renderList(l, i))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{messages.lists.noMyLists}</Text>
            )
          ) : null}
        </View>
      </ScrollView>

      {followersModal ? (
        <FollowersModal
          visible
          onClose={() => setFollowersModal(null)}
          username={username}
          initialTab={followersModal}
        />
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  sectionGap: {
    height: Spacing.xxl,
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
  listCard: {
    marginBottom: Spacing.md,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: FontSize.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.xxxl,
  },
});
