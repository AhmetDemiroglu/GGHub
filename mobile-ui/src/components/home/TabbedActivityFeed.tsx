import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { SegmentedTabs } from '@/src/components/common/SegmentedTabs';
import { FeedCard } from '@/src/components/home/FeedCard';
import { FontSize, Spacing, Shadows, Springs } from '@/src/constants/theme';
import { getPersonalizedFeed } from '@/src/api/activity';
import { Activity, ActivityType } from '@/src/models/activity';
import { onReviewVote } from '@/src/utils/review-vote-bus';
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
const FAB_VISIBLE_OFFSET = 1200;
// İçeriğin parmağı izlerken kayabileceği azami mesafe (dampened drag).
const DRAG_MAX = 72;
// Sekme değiştirme eşiği: ham parmak yolu (px) veya hızlı flick.
const COMMIT_DX = 60;
const COMMIT_VELOCITY = 650;

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

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList,
) as unknown as typeof FlatList;

interface TabbedActivityFeedProps {
  header: React.ReactElement;
  onRefreshHome: () => Promise<unknown> | void;
  refreshingHome: boolean;
  contentPaddingBottom: number;
}

export function TabbedActivityFeed({ header, onRefreshHome, refreshingHome, contentPaddingBottom }: TabbedActivityFeedProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { width } = useWindowDimensions();
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

  // UI-thread scroll takibi: sticky bar + FAB + sekme-değişim snap'i buradan beslenir.
  const scrollY = useSharedValue(0);
  // Pill bar'ın liste içeriğindeki gerçek y konumu (header + margin dahil).
  const barY = useSharedValue(0);
  const [fabVisible, setFabVisible] = useState(false);
  const [barPinned, setBarPinned] = useState(false);

  // İnteraktif sekme sürüklemesi: içerik dampened kayar, pill parmağı izler.
  const dragX = useSharedValue(0);
  const tabIndexSV = useSharedValue(0);
  const activeIndex = TAB_ORDER.indexOf(activeTab);

  useEffect(() => {
    tabIndexSV.value = withSpring(activeIndex, Springs.snappy);
  }, [activeIndex, tabIndexSV]);

  // Pill göstergesinin sürekli konumu: aktif indeks + sürükleme kesri.
  const pillProgress = useDerivedValue(() => {
    return tabIndexSV.value + interpolate(
      -dragX.value,
      [-DRAG_MAX, 0, DRAG_MAX],
      [-0.6, 0, 0.6],
      Extrapolation.CLAMP,
    );
  });

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

  // Oy senkronu: detay sayfası / oyun sayfası / feed kalbi nerede oy verirse
  // versin, TÜM sekmelerdeki kart kopyaları anında güncellenir.
  useEffect(() => {
    return onReviewVote((event) => {
      setFeeds((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const tab of TAB_ORDER) {
          const items = prev[tab].items;
          if (!items.some((a) => a.reviewData?.reviewId === event.reviewId)) continue;
          changed = true;
          next[tab] = {
            ...prev[tab],
            items: items.map((a) =>
              a.reviewData?.reviewId === event.reviewId
                ? {
                    ...a,
                    reviewData: {
                      ...a.reviewData,
                      likeCount: Math.max(0, (a.reviewData.likeCount ?? 0) + event.likeDelta),
                      myVote: event.myVote,
                    },
                  }
                : a,
            ),
          };
        }
        return changed ? next : prev;
      });
    });
  }, []);

  // Sekme değişince: kullanıcı feed'in içindeyse yeni sekmenin başına snap et
  // (pill bar tam pinned konumda kalır, boşluk hissi oluşmaz).
  useEffect(() => {
    const pinOffset = barY.value - Spacing.sm;
    if (barY.value > 0 && scrollY.value > pinOffset) {
      listRef.current?.scrollToOffset({ offset: pinOffset, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const switchTab = useCallback(
    (dir: 1 | -1) => {
      setActiveTab((prev) => {
        const idx = TAB_ORDER.indexOf(prev);
        const next = idx + dir;
        if (next < 0 || next >= TAB_ORDER.length) return prev;
        haptics.selection();
        // Yeni içerik ters yönden dampened girip yerine otursun.
        dragX.value = dir === 1 ? DRAG_MAX : -DRAG_MAX;
        dragX.value = withSpring(0, Springs.smooth);
        return TAB_ORDER[next];
      });
    },
    [dragX],
  );

  // Yatay pan: içerik parmağı dampened izler; eşik aşımında sekme değişir,
  // altında yaylanarak geri oturur. Dikey scroll FlatList'te kalır.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-16, 16])
        .onUpdate((event) => {
          const idx = tabIndexSV.value;
          const raw = event.translationX;
          // Kenarda (ilk/son sekme) direnç artar.
          const atEdge = (raw > 0 && idx <= 0) || (raw < 0 && idx >= TAB_ORDER.length - 1);
          const damp = atEdge ? 0.12 : 0.42;
          const next = Math.max(-DRAG_MAX, Math.min(DRAG_MAX, raw * damp));
          dragX.value = next;
        })
        .onEnd((event) => {
          const raw = event.translationX;
          const commit =
            Math.abs(raw) > COMMIT_DX || Math.abs(event.velocityX) > COMMIT_VELOCITY;
          if (commit && raw < 0) {
            runOnJS(switchTab)(1);
          } else if (commit && raw > 0) {
            runOnJS(switchTab)(-1);
          } else {
            dragX.value = withSpring(0, Springs.smooth);
          }
        }),
    [dragX, tabIndexSV, switchTab],
  );

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

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Eşik geçişlerinde (yalnızca değişim anında) JS state'e in: FAB + pinned bar.
  useAnimatedReaction(
    () => scrollY.value > FAB_VISIBLE_OFFSET,
    (visible, prev) => {
      if (visible !== prev) runOnJS(setFabVisible)(visible);
    },
  );
  useAnimatedReaction(
    () => barY.value > 0 && scrollY.value >= barY.value - Spacing.sm,
    (pinned, prev) => {
      if (pinned !== prev) runOnJS(setBarPinned)(pinned);
    },
  );

  const scrollToTop = useCallback(() => {
    haptics.impactLight();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const contentDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  // Pinned bar frame-perfect görünürlük (worklet); dokunuşlar state ile açılır.
  const pinnedBarStyle = useAnimatedStyle(() => ({
    opacity: barY.value > 0 && scrollY.value >= barY.value - Spacing.sm ? 1 : 0,
  }));

  const tabItems = useMemo(
    () => [
      { key: 'reviews' as const, label: tt.reviews },
      { key: 'lists' as const, label: tt.lists },
      { key: 'follows' as const, label: tt.follows },
      { key: 'all' as const, label: tt.all },
    ],
    [tt],
  );

  const listHeader = (
    <View>
      {header}
      <View style={styles.tabBarWrap} onLayout={(e) => (barY.value = e.nativeEvent.layout.y)}>
        <SegmentedTabs<TabKey> tabs={tabItems} activeKey={activeTab} onChange={setActiveTab} progress={pillProgress} />
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
        <Animated.View style={[styles.root, contentDragStyle]}>
          <AnimatedFlatList
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
            onScroll={scrollHandler}
            scrollEventThrottle={16}
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
        </Animated.View>
      </GestureDetector>

      {/* Pill bar, listedeki ikiziyle aynı hizaya gelince tepeye sabitlenir;
          akış artık bunun ALTINDAN kayar (X davranışı). */}
      <Animated.View
        style={[
          styles.pinnedBar,
          { backgroundColor: colors.background, borderBottomColor: colors.border, width },
          pinnedBarStyle,
        ]}
        pointerEvents={barPinned ? 'auto' : 'none'}
      >
        <SegmentedTabs<TabKey> tabs={tabItems} activeKey={activeTab} onChange={setActiveTab} progress={pillProgress} />
      </Animated.View>

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
  pinnedBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
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
