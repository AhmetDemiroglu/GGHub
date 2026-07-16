import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppTopBar } from '@/src/components/shell';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getHomeContent } from '@/src/api/home';
import { getSuggestedUsers } from '@/src/api/social';
import { getMyProfile } from '@/src/api/profile';
import { displayName } from '@/src/utils/display-name';
import { HeroSlider } from '@/src/components/home/HeroSlider';
import { StatsBar } from '@/src/components/home/StatsBar';
import { BentoGrid } from '@/src/components/home/BentoGrid';
import { PeopleYouMayKnow } from '@/src/components/home/PeopleYouMayKnow';
import { TabbedActivityFeed } from '@/src/components/home/TabbedActivityFeed';

function HomeSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonHero, { backgroundColor: colors.skeleton }]} />
      <View style={styles.skeletonStatsRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.skeletonStat, { backgroundColor: colors.skeleton }]} />
        ))}
      </View>
      <View style={[styles.skeletonSection, { backgroundColor: colors.skeleton }]} />
      <View style={styles.skeletonCardRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.skeleton }]} />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const t = messages.home;

  const {
    data: homeContent,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['homeContent'],
    queryFn: getHomeContent,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: () => getSuggestedUsers(12),
    enabled: isAuthenticated,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppTopBar showLogo />
        <HomeSkeleton />
      </View>
    );
  }

  if (isError || !homeContent) {
    return (
      <View style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <AppTopBar showLogo />
        <Text style={[styles.errorText, { color: colors.error }]}>
          {messages.common.genericError}
        </Text>
        <Text
          style={[styles.retryText, { color: colors.primary }]}
          onPress={() => refetch()}
        >
          {messages.common.retry}
        </Text>
      </View>
    );
  }

  // Selamlama: varsa AD SOYAD ön planda, altında @username (yoksa sadece username).
  const hasRealName = !!(myProfile?.firstName || myProfile?.lastName);
  const greetingName = myProfile
    ? displayName(myProfile)
    : user?.username ?? '';

  const topSections = (
    <>
      {user ? (
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{t.welcome}</Text>
          <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
            {greetingName}
          </Text>
          {hasRealName && user ? (
            <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
              @{user.username}
            </Text>
          ) : null}
        </View>
      ) : null}

      <HeroSlider games={homeContent.heroGames} />

      <StatsBar stats={homeContent.siteStats} />

      <BentoGrid
        trendingGames={homeContent.trendingLocal}
        leaderboard={homeContent.topGamers}
        showJoinCta={!isAuthenticated}
      />

      {isAuthenticated && suggestions && suggestions.length > 0 ? (
        <PeopleYouMayKnow suggestions={suggestions} />
      ) : null}
    </>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppTopBar showLogo />
      {isAuthenticated ? (
        <TabbedActivityFeed
          header={topSections}
          onRefreshHome={refetch}
          refreshingHome={isRefetching}
          contentPaddingBottom={tabBarHeight + Spacing.md}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.md }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {topSections}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {},
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.md,
  },
  displayName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  handle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  errorText: {
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  // Skeleton
  skeletonContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  skeletonHero: {
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  skeletonStat: {
    flex: 1,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  skeletonSection: {
    height: 24,
    borderRadius: BorderRadius.sm,
    width: '40%',
  },
  skeletonCardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  skeletonCard: {
    width: 140,
    height: 200,
    borderRadius: BorderRadius.md,
  },
});
