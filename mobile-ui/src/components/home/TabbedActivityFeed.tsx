import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { SegmentedTabs } from '@/src/components/common/SegmentedTabs';
import { FeedCard } from '@/src/components/home/FeedCard';
import { FontSize, Spacing, Shadows } from '@/src/constants/theme';
import { getPersonalizedFeed } from '@/src/api/activity';
import { Activity, ActivityType } from '@/src/models/activity';
import * as haptics from '@/src/utils/haptics';

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
const FAB_VISIBLE_OFFSET = 1200;

interface TabState {
  items: Activity[];
  hasMore: boolean;
  loading: boolean;
  loaded: boolean;
}

const emptyTab = (): TabState => ({ items: [], hasMore: true, loading: false, loaded: false });

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

  const listRef = useRef<FlatList<Activity>>(null);
  // Home tab'a tekrar basınca en üste kaydır (X davranışı).
  useScrollToTop(listRef);

  // header yüksekliği: tab değişiminde "feed başlangıcına" snap için.
  const headerHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const [fabVisible, setFabVisible] = useState(false);

  const loadTab = useCallback(async (tab: TabKey, reset: boolean) => {
    const current = feedsRef.current[tab];
    if (current.loading) return;
    if (!reset && current.loaded && !current.hasMore) return;

    setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true } }));

    try {
      const cursor = reset
        ? undefined
        : feedsRef.current[tab].items.reduce<string | undefined>(
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
            // Tüm sayfa yinelenen geldiyse dur (aksi halde onEndReached döngüye girer).
            hasMore: fresh.length > 0 && page.length >= PAGE_SIZE,
            loading: false,
            loaded: true,
          },
        };
      });
    } catch {
      setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: false, loaded: true, hasMore: false } }));
    }
  }, []);

  // Açılışta önce varsayılan sekme (İncelemeler), ardından diğer sekmeler arka
  // planda sırayla doldurulur; sekme değişince içerik ANINDA hazırdır.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadTab('reviews', true);
      for (const tab of ['lists', 'follows', 'all'] as TabKey[]) {
        if (cancelled) return;
        if (!feedsRef.current[tab].loaded) await loadTab(tab, true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTab]);

  // Emniyet: prefetch başarısız olduysa sekmeye girildiğinde yükle.
  useEffect(() => {
    const state = feedsRef.current[activeTab];
    if (!state.loaded && !state.loading) void loadTab(activeTab, true);
  }, [activeTab, loadTab]);

  // Sekme değişince: kullanıcı feed'in içindeyse yeni sekmenin başına snap et.
  // (Eski davranışta offset korunuyordu; kısa içerikli sekmede koca bir boşluk
  // görünüyor, içerik "gelmemiş" hissi yaratıyordu.)
  useEffect(() => {
    const headerH = headerHeightRef.current;
    if (headerH > 0 && scrollOffsetRef.current > headerH) {
      listRef.current?.scrollToOffset({ offset: headerH, animated: false });
    }
  }, [activeTab]);

  const switchTab = useCallback((dir: 1 | -1) => {
    setActiveTab((prev) => {
      const idx = TAB_ORDER.indexOf(prev);
      const next = idx + dir;
      if (next < 0 || next >= TAB_ORDER.length) return prev;
      haptics.selection();
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
    // Tüm sekmeleri tazele: önce aktif olan, diğerleri arkadan.
    await loadTab(activeTab, true);
    for (const tab of TAB_ORDER) {
      if (tab !== activeTab) void loadTab(tab, true);
    }
  }, [onRefreshHome, loadTab, activeTab]);

  const onEndReached = useCallback(() => {
    const state = feedsRef.current[activeTab];
    if (state.loaded && state.hasMore && !state.loading) {
      void loadTab(activeTab, false);
    }
  }, [activeTab, loadTab]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollOffsetRef.current = y;
    setFabVisible((visible) => {
      const next = y > FAB_VISIBLE_OFFSET;
      return next === visible ? visible : next;
    });
  }, []);

  const scrollToTop = useCallback(() => {
    haptics.impactLight();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const listHeader = (
    <View>
      <View onLayout={(e) => (headerHeightRef.current = e.nativeEvent.layout.height)}>{header}</View>
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
    active.loaded && !active.loading && active.items.length === 0 ? (
      <View style={styles.empty}>
        <Ionicons name="sparkles-outline" size={28} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{messages.home.activityEmptyTitle}</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{messages.home.activityEmptyDescription}</Text>
      </View>
    ) : (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );

  return (
    <View style={styles.root}>
      <GestureDetector gesture={panGesture}>
        <FlatList
          ref={listRef}
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
          onEndReachedThreshold={0.8}
          onScroll={onScroll}
          scrollEventThrottle={64}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: contentPaddingBottom + Spacing.xl }}
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
            ) : !active.hasMore && active.items.length > 0 ? (
              <Text style={[styles.feedEnd, { color: colors.textSecondary }]}>{messages.home.feedEnd}</Text>
            ) : null
          }
        />
      </GestureDetector>

      {fabVisible ? (
        <Pressable
          onPress={scrollToTop}
          style={[
            styles.fab,
            { backgroundColor: colors.primary, bottom: contentPaddingBottom + Spacing.md },
            Shadows.md,
          ]}
          accessibilityLabel={messages.home.backToTop}
        >
          <Ionicons name="arrow-up" size={20} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  feedEnd: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    paddingVertical: Spacing.lg,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
