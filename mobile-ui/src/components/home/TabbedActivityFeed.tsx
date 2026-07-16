import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { SegmentedTabs } from '@/src/components/common/SegmentedTabs';
import { FeedCard } from '@/src/components/home/FeedCard';
import { FontSize, Spacing } from '@/src/constants/theme';
import { getPersonalizedFeed } from '@/src/api/activity';
import { Activity, ActivityType } from '@/src/models/activity';

type TabKey = 'reviews' | 'lists' | 'follows' | 'all';

const TAB_ORDER: TabKey[] = ['reviews', 'lists', 'follows', 'all'];
const TAB_TYPE: Record<TabKey, ActivityType | undefined> = {
  reviews: ActivityType.Review,
  lists: ActivityType.ListCreated,
  follows: ActivityType.FollowUser,
  all: undefined,
};

const PAGE_SIZE = 10;
const SWIPE_THRESHOLD = 55;

interface TabState {
  items: Activity[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  loaded: boolean;
}

const emptyTab = (): TabState => ({ items: [], cursor: null, hasMore: true, loading: false, loaded: false });

function activityKey(a: Activity): string {
  if (a.type === ActivityType.Review) return `r-${a.reviewData?.reviewId}-${a.occurredAt}`;
  if (a.type === ActivityType.ListCreated) return `l-${a.listData?.listId}-${a.occurredAt}`;
  return `f-${a.actor?.username}-${a.followData?.username}-${a.occurredAt}`;
}

interface TabbedActivityFeedProps {
  header: React.ReactElement;
  onRefreshHome: () => Promise<unknown> | void;
  refreshingHome: boolean;
  contentPaddingBottom: number;
}

export function TabbedActivityFeed({ header, onRefreshHome, refreshingHome, contentPaddingBottom }: TabbedActivityFeedProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const tt = messages.home.activityTabs;

  const [activeTab, setActiveTab] = useState<TabKey>('reviews');
  const [feeds, setFeeds] = useState<Record<TabKey, TabState>>({
    reviews: emptyTab(),
    lists: emptyTab(),
    follows: emptyTab(),
    all: emptyTab(),
  });
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  const loadTab = useCallback(async (tab: TabKey, reset: boolean) => {
    const current = feedsRef.current[tab];
    if (current.loading) return;
    if (!reset && (!current.hasMore || !current.loaded)) {
      if (current.loaded && !current.hasMore) return;
    }

    setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true } }));

    try {
      const cursor = reset ? undefined : current.items.reduce<string | undefined>(
        (min, a) => (min === undefined || a.occurredAt < min ? a.occurredAt : min),
        undefined,
      );
      const page = await getPersonalizedFeed(PAGE_SIZE, cursor, TAB_TYPE[tab]);

      setFeeds((prev) => {
        const base = reset ? [] : prev[tab].items;
        const seen = new Set(base.map(activityKey));
        const fresh = page.filter((a) => !seen.has(activityKey(a)));
        return {
          ...prev,
          [tab]: {
            items: [...base, ...fresh],
            cursor: cursor ?? null,
            hasMore: page.length >= PAGE_SIZE,
            loading: false,
            loaded: true,
          },
        };
      });
    } catch {
      setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: false, loaded: true, hasMore: false } }));
    }
  }, []);

  // İlk açılışta ve sekme değişince (henüz yüklenmediyse) yükle.
  useEffect(() => {
    const state = feedsRef.current[activeTab];
    if (!state.loaded && !state.loading) {
      void loadTab(activeTab, true);
    }
  }, [activeTab, loadTab]);

  const switchTab = useCallback((dir: 1 | -1) => {
    setActiveTab((prev) => {
      const idx = TAB_ORDER.indexOf(prev);
      const next = idx + dir;
      if (next < 0 || next >= TAB_ORDER.length) return prev;
      return TAB_ORDER[next];
    });
  }, []);

  // Yatay swipe ile sekme geçişi. Dikey kaydırma FlatList'e kalsın diye
  // failOffsetY dar tutulur; yatay eşik geçilince Pan aktifleşir.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-14, 14])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_THRESHOLD) {
        runOnJS(switchTab)(1);
      } else if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(switchTab)(-1);
      }
    });

  const active = feeds[activeTab];

  const onRefresh = useCallback(async () => {
    await Promise.resolve(onRefreshHome());
    await loadTab(activeTab, true);
  }, [onRefreshHome, loadTab, activeTab]);

  const onEndReached = useCallback(() => {
    const state = feedsRef.current[activeTab];
    if (state.loaded && state.hasMore && !state.loading) {
      void loadTab(activeTab, false);
    }
  }, [activeTab, loadTab]);

  const listHeader = (
    <View>
      {header}
      <View style={styles.tabBarWrap}>
        <SegmentedTabs<TabKey>
          tabs={[
            { key: 'reviews', label: tt.reviews },
            { key: 'lists', label: tt.lists },
            { key: 'follows', label: tt.follows },
            { key: 'all', label: tt.all },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </View>
    </View>
  );

  const emptyComponent =
    active.loaded && !active.loading ? (
      <View style={styles.empty}>
        <Ionicons name="sparkles-outline" size={28} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{messages.home.activityEmptyTitle}</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{messages.home.activityEmptyDescription}</Text>
      </View>
    ) : active.loading && active.items.length === 0 ? (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.primary} />
      </View>
    ) : null;

  return (
    <GestureDetector gesture={panGesture}>
      <FlatList
        data={active.items}
        keyExtractor={activityKey}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <FeedCard activity={item} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyComponent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshingHome}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={
          active.loading && active.items.length > 0 ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : null
        }
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: Spacing.lg,
  },
});
