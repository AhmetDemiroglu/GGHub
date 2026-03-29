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
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getHomeContent } from '@/src/api/home';
import { getPersonalizedFeed } from '@/src/api/activity';
import { HeroSlider } from '@/src/components/home/HeroSlider';
import { StatsBar } from '@/src/components/home/StatsBar';
import { ActivityFeed } from '@/src/components/home/ActivityFeed';
import { BentoGrid } from '@/src/components/home/BentoGrid';

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

  const { data: activities } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => getPersonalizedFeed(10),
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

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppTopBar showLogo />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {t.welcome}
          </Text>
          {user ? (
            <Text style={[styles.username, { color: colors.text }]}>@{user.username}</Text>
          ) : null}
        </View>

        <HeroSlider games={homeContent.heroGames} />

        <StatsBar stats={homeContent.siteStats} />

        <BentoGrid
          trendingGames={homeContent.trendingLocal}
          leaderboard={homeContent.topGamers}
          showJoinCta={!isAuthenticated}
        />

        {isAuthenticated && activities && activities.length > 0 && (
          <ActivityFeed activities={activities} />
        )}
      </ScrollView>
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
  content: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.md,
  },
  username: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.xs,
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
