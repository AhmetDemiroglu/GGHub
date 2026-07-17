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
import { useShell, SIDEBAR_WIDTH } from '@/src/contexts/shell-context';
import { SegmentedTabs } from '@/src/components/common/SegmentedTabs';
import { FeedCard } from '@/src/components/home/FeedCard';
import { HomePanProvider } from '@/src/components/home/HorizontalScrollGuard';
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
// Hızlı flick eşiği; mesafe eşiği ekran genişliğine oranla hesaplanır.
const COMMIT_VELOCITY = 650;
const COMMIT_RATIO = 0.3;
// Jest niyet eşikleri (manuel aktivasyon).
const INTENT_DX = 22;
const INTENT_DY = 14;
// Jest modları.
const MODE_NONE = 0;
const MODE_TABS = 1;
const MODE_SIDEBAR = 2;

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
  const { openSidebar, sidebarProgress } = useShell();
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
  // Jest durumu: mod (yok/sekme/sidebar), niyet başlangıcı, commit bekliyor mu.
  const gestureMode = useSharedValue(MODE_NONE);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);
  const gestureRejected = useSharedValue(false);
  const pendingCommit = useSharedValue(false);
  const sidebarSettled = useSharedValue(true);
  // Kök konteynerin ekran üzerindeki y'si: pill bar'ın ekran konumunu
  // worklet'te hesaplayabilmek için (dokunuş bar'ın altında mı?).
  const rootPageY = useSharedValue(0);
  const rootRef = useRef<View>(null);
  const activeIndex = TAB_ORDER.indexOf(activeTab);

  useEffect(() => {
    tabIndexSV.value = withSpring(activeIndex, Springs.snappy);
  }, [activeIndex, tabIndexSV]);

  // Pill göstergesinin sürekli konumu: aktif indeks + sürükleme kesri.
  // Kesir YALNIZCA parmak ekrandayken (MODE_TABS) uygulanır; parmak kalkar
  // kalkmaz jest sonu kesri tabIndexSV'ye DEVREDER (bkz. absorbDragIntoPill),
  // böylece mod MODE_NONE'a düşerken pill'in konumu hiç zıplamaz.
  // Eşleme X gibi sayfa-oranlıdır: kartlar yarım ekran kaydıysa pill yarım pill kaymıştır.
  const pillProgress = useDerivedValue(() => {
    const dragFraction =
      gestureMode.value === MODE_TABS
        ? interpolate(-dragX.value, [-width, 0, width], [-1, 0, 1], Extrapolation.CLAMP)
        : 0;
    return tabIndexSV.value + dragFraction;
  });

  /**
   * Parmak kalkarken pill'in KESIRLI konumunu tabIndexSV'ye tasir ve kesri
   * kapatir. Ikisi ayni karede oldugu icin pill gorsel olarak yerinde kalir.
   *
   * Olmazsa "goz kirpma": pillProgress = tabIndexSV + dragFraction ve kesir
   * yalniz MODE_TABS iken uygulaniyor. onEnd'den hemen sonra onFinalize modu
   * MODE_NONE yapinca kesir ANINDA sifirlaniyor, tabIndexSV ise hala ESKI
   * indekste; pill once eski sekmeye geri firliyor. Yeni indeks de ancak
   * commitSwitch -> setActiveTab -> effect zincirinden birkac kare sonra
   * geldigi icin pill oraya tik diye atliyordu.
   *
   * @returns Devir oncesi yuvarlanmis (islenmis) sekme indeksi.
   */
  const absorbDragIntoPill = useCallback(() => {
    'worklet';
    const idx = Math.round(tabIndexSV.value);
    const fraction = interpolate(-dragX.value, [-width, 0, width], [-1, 0, 1], Extrapolation.CLAMP);
    tabIndexSV.value = tabIndexSV.value + fraction;
    gestureMode.value = MODE_NONE;
    return idx;
  }, [tabIndexSV, dragX, gestureMode, width]);

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

  // Commit'in JS fazı: eski kartlar ekran dışına akmışken veri değişir ve
  // yeni kartlar karşı kenardan girip oturur (X'in push geçişi). Header ve
  // pill bar bu sırada HİÇ kımıldamaz; kayan yalnızca kart hücreleridir.
  const commitSwitch = useCallback(
    (dir: 1 | -1) => {
      haptics.selection();
      setActiveTab((prev) => {
        const idx = TAB_ORDER.indexOf(prev);
        const next = Math.min(Math.max(idx + dir, 0), TAB_ORDER.length - 1);
        return TAB_ORDER[next];
      });
      dragX.value = dir === 1 ? width : -width;
      dragX.value = withSpring(0, Springs.snappy);
      pendingCommit.value = false;
    },
    [dragX, pendingCommit, width],
  );

  /**
   * Ana sayfanın TEK yatay jesti (X davranışı):
   * - İlk sekmede sağa çekiş: ekranın HER yerinden sidebar'ı parmakla sürer
   *   (yarım çek-bırak kapanır, eşik üstü yerleşir).
   * - Diğer durumlarda pill bar'ın ALTINDAN başlayan çekişler sekme değiştirir.
   * - Bar'ın üstündeki bölgede (hero/karuseller) yatay listeler doğal kayar:
   *   sola çekişler zaten jeste takılmaz, sağa çekişleri ise karusellerin
   *   HorizontalScrollGuard'ı bu pan'ı bekleterek kendine alır.
   * Manuel aktivasyon: niyet netleşmeden hiçbir native scroll iptal edilmez.
   */
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onTouchesDown((e) => {
          const touch = e.allTouches[0];
          touchStartX.value = touch.absoluteX;
          touchStartY.value = touch.absoluteY;
          gestureRejected.value = false;
          gestureMode.value = MODE_NONE;
        })
        .onTouchesMove((e, stateManager) => {
          if (gestureRejected.value || gestureMode.value !== MODE_NONE) return;
          const touch = e.allTouches[0];
          const dx = touch.absoluteX - touchStartX.value;
          const dy = touch.absoluteY - touchStartY.value;

          // Dikey niyet: FlatList kaydırsın.
          if (Math.abs(dy) > INTENT_DY && Math.abs(dy) > Math.abs(dx)) {
            gestureRejected.value = true;
            stateManager.fail();
            return;
          }
          if (Math.abs(dx) < INTENT_DX) return;

          const idx = Math.round(tabIndexSV.value);

          // İlk sekmede sağa çekiş = sidebar (yatay karuseller hariç her
          // yerden; onların üstünde bu pan native scroll'u bekler ve iptal
          // olur, aşağıdaki activate() hiç kazanmaz).
          if (dx > 0 && idx === 0) {
            gestureMode.value = MODE_SIDEBAR;
            sidebarSettled.value = false;
            stateManager.activate();
            return;
          }

          // Sekme modu yalnızca pill bar'ın altından başlayan dokunuşlarda:
          // üstte hero/karuseller kendi yatay scroll'unu korur.
          const barScreenY = rootPageY.value + Math.max(barY.value - scrollY.value, 0);
          if (touchStartY.value >= barScreenY) {
            gestureMode.value = MODE_TABS;
            stateManager.activate();
            return;
          }

          gestureRejected.value = true;
          stateManager.fail();
        })
        .onUpdate((event) => {
          if (gestureMode.value === MODE_SIDEBAR) {
            const p = event.translationX / SIDEBAR_WIDTH;
            sidebarProgress.value = Math.min(Math.max(p, 0), 1);
            return;
          }
          if (gestureMode.value !== MODE_TABS) return;
          const idx = tabIndexSV.value;
          const raw = event.translationX;
          // Kenarda (son sekmeden ileri) kısa, dirençli esneme; içeride X gibi
          // parmağı 1:1'e yakın izleyen gerçek sayfa sürüklemesi.
          const atEdge = (raw > 0 && idx <= 0) || (raw < 0 && idx >= TAB_ORDER.length - 1);
          if (atEdge) {
            dragX.value = Math.max(-56, Math.min(56, raw * 0.14));
          } else {
            dragX.value = Math.max(-width, Math.min(width, raw * 0.92));
          }
        })
        .onEnd((event) => {
          if (gestureMode.value === MODE_SIDEBAR) {
            sidebarSettled.value = true;
            const shouldOpen = sidebarProgress.value > 0.4 || event.velocityX > 600;
            if (shouldOpen) {
              sidebarProgress.value = withSpring(1, Springs.smooth);
              runOnJS(openSidebar)();
            } else {
              sidebarProgress.value = withSpring(0, Springs.smooth);
            }
            return;
          }
          if (gestureMode.value !== MODE_TABS) return;

          const raw = event.translationX;
          const dir: 1 | -1 = raw < 0 ? 1 : -1;
          // Kesri pill'e devret (mod da burada MODE_NONE olur); idx devir
          // ONCESI işlenmiş sekmedir.
          const idx = absorbDragIntoPill();
          const target = idx + dir;
          const commit =
            (Math.abs(raw) > width * COMMIT_RATIO || Math.abs(event.velocityX) > COMMIT_VELOCITY) &&
            target >= 0 &&
            target < TAB_ORDER.length;

          if (commit) {
            // Faz 1 (UI thread): eski kartlar kaldıkları yerden ekran dışına
            // akar; bitince JS fazı veriyi değiştirir ve yenisi karşıdan girer.
            pendingCommit.value = true;
            // Pill kesirli konumundan hedefe KESİNTİSİZ akar ve React state
            // turunu BEKLEMEZ. commitSwitch sonrası effect'teki
            // withSpring(activeIndex) pill zaten hedefte olduğu için no-op.
            tabIndexSV.value = withTiming(target, { duration: 130 });
            dragX.value = withTiming(dir === 1 ? -width : width, { duration: 130 }, (finished) => {
              if (finished) runOnJS(commitSwitch)(dir);
            });
          } else {
            // Eşik altı: pill de kartlarla birlikte yaylanarak yerine döner.
            tabIndexSV.value = withSpring(idx, Springs.smooth);
            dragX.value = withSpring(0, Springs.smooth);
          }
        })
        .onFinalize(() => {
          // Emniyet: iptal edilen/yarım kalan jest asla kaymış ekran bırakmaz.
          // Buraya yalnızca onEnd HİÇ çalışmadığında (jest iptal) MODE_TABS ile
          // gelinir; onEnd kendi içinde devri yapıp modu düşürüyor. İptalde de
          // kesri devretmezsek pill yine geri fırlardı.
          if (gestureMode.value === MODE_TABS && !pendingCommit.value) {
            const idx = absorbDragIntoPill();
            tabIndexSV.value = withSpring(idx, Springs.smooth);
            dragX.value = withSpring(0, Springs.smooth);
          }
          if (gestureMode.value === MODE_SIDEBAR && !sidebarSettled.value) {
            sidebarSettled.value = true;
            sidebarProgress.value = withSpring(0, Springs.smooth);
          }
          gestureMode.value = MODE_NONE;
        }),
    [
      dragX,
      tabIndexSV,
      gestureMode,
      touchStartX,
      touchStartY,
      gestureRejected,
      pendingCommit,
      sidebarSettled,
      rootPageY,
      barY,
      scrollY,
      sidebarProgress,
      openSidebar,
      commitSwitch,
      absorbDragIntoPill,
      width,
    ],
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

  // Kayma dönüşümü YALNIZCA veri hücrelerine uygulanır (feed kartları).
  // ListHeader (hero, PYMK, liderlik, pill bar) render ağacında hücre
  // olmadığı için yerinden kımıldamaz: X'teki gibi sadece akış sayfalanır.
  const cardsSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const CardCellRenderer = useMemo(() => {
    return function CardCell({ children, style, ...props }: React.ComponentProps<typeof Animated.View>) {
      return (
        <Animated.View {...props} style={[style, cardsSlideStyle]}>
          {children}
        </Animated.View>
      );
    };
  }, [cardsSlideStyle]);

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
    // Karuseller `header` içinde ama BU ağaçta render edilir; provider'ı
    // görürler ve pan'ı kendi native scroll'larına bekletirler.
    <HomePanProvider value={panGesture}>
      <View
        ref={rootRef}
        style={styles.root}
        onLayout={() => {
          // Pill bar'ın ekran-üstü konumunu worklet'te hesaplamak için kökün
          // pencere içindeki y'si gerekir (AppTopBar yüksekliği dahil).
          rootRef.current?.measureInWindow((_x, y) => {
            rootPageY.value = y;
          });
        }}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View style={styles.root}>
            <AnimatedFlatList
              ref={listRef}
              data={active.items}
              keyExtractor={activityKey}
              CellRendererComponent={CardCellRenderer}
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
    </HomePanProvider>
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
