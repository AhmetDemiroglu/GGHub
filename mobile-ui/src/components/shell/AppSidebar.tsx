import React, { useCallback, useEffect } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  BackHandler,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  clamp,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Avatar } from '@/src/components/common/Avatar';
import { useShell } from '@/src/contexts/shell-context';
import {
  BorderRadius,
  FontSize,
  Spacing,
  Springs,
  Shadows,
  type ThemeColors,
} from '@/src/constants/theme';
import type { AppLocale } from '@/src/i18n';
import * as haptics from '@/src/utils/haptics';
import type { ThemeMode } from '@/src/contexts/theme-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 330);
const EDGE_STRIP_WIDTH = 24;

// Navbar (tab) kokleri: bu ekranlarda sol kenardan kaydirinca sidebar acilir.
const TAB_ROOTS = ['/', '/discover', '/search', '/lists', '/profile'];

/* ───────────────────────── Nav Row (sade liste satırı) ───────────────────────── */
interface NavRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  danger?: boolean;
  muted?: boolean;
}

function NavRow({ icon, label, onPress, colors, danger = false, muted = false }: NavRowProps) {
  const color = danger ? colors.error : muted ? colors.textSecondary : colors.text;
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.5 }]}
    >
      <Ionicons name={icon} size={muted ? 21 : 23} color={color} />
      <Text
        style={[muted ? styles.navLabelMuted : styles.navLabel, { color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ───────────────────────── Compact theme control ───────────────────────── */
function ThemeControl({
  mode,
  onSet,
  colors,
}: {
  mode: ThemeMode;
  onSet: (m: ThemeMode) => void;
  colors: ThemeColors;
}) {
  const options: { key: ThemeMode; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'system', icon: 'phone-portrait-outline' },
    { key: 'light', icon: 'sunny-outline' },
    { key: 'dark', icon: 'moon-outline' },
  ];
  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceHighlight }]}>
      {options.map((opt) => {
        const active = mode === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              if (!active) {
                haptics.selection();
                onSet(opt.key);
              }
            }}
            style={[styles.segmentBtn, active && { backgroundColor: colors.background, ...Shadows.sm }]}
          >
            <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Compact language control ───────────────────────── */
function LanguageControl({
  locale,
  onSwitch,
  colors,
}: {
  locale: AppLocale;
  onSwitch: (l: AppLocale) => void;
  colors: ThemeColors;
}) {
  const options: { key: AppLocale; label: string }[] = [
    { key: 'tr', label: 'TR' },
    { key: 'en-US', label: 'EN' },
  ];
  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceHighlight }]}>
      {options.map((opt) => {
        const active = locale === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              if (!active) {
                haptics.selection();
                onSwitch(opt.key);
              }
            }}
            style={[
              styles.segmentBtn,
              styles.segmentBtnWide,
              active && { backgroundColor: colors.background, ...Shadows.sm },
            ]}
          >
            <Text style={[styles.segmentLabel, { color: active ? colors.primary : colors.textMuted }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Main Sidebar (X-style parallax) ─────────────────────────
 * Mimari: 3 katman, tek `progress` shared value [0=kapalı, 1=açık]
 *  - Drawer (altta, sabit): hafif parallax drift
 *  - Ana içerik (kayan): translateX + scale + yuvarlak köşe + sidebar'a düşen gölge
 *  - Scrim (ana içerik üstünde): hafif tema-rengi veil (gri değil) + tap/swipe-to-close
 * Edge-swipe açma: sadece ana sayfada, sol kenar şeridi
 */
interface AppSidebarProps {
  children: React.ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  const insets = useSafeAreaInsets();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { locale, switchLocale, messages } = useLocale();
  const { user, logout, isAuthenticated } = useAuth();
  const { isSidebarOpen, openSidebar, closeSidebar } = useShell();
  const router = useRouter();
  const pathname = usePathname();

  const progress = useSharedValue(0);
  // Sidebar acma gesture'i artik tum navbar (tab) koklerinde aktif (sadece ana sayfada degil).
  // Nested/detay ekranlarda kapali kalir; orada soldan-saga geri jesti devrede.
  const isTabRoot = TAB_ROOTS.includes(pathname);

  // Sync progress with open state
  useEffect(() => {
    if (isSidebarOpen) {
      progress.value = withSpring(1, Springs.smooth);
    } else {
      progress.value = withSpring(0, Springs.smooth);
    }
  }, [isSidebarOpen, progress]);

  // Android back handler - drawer açıkken back ile kapat
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSidebarOpen) {
        closeSidebar();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isSidebarOpen, closeSidebar]);

  // KAPATMA pan'i - scrim üzerinde, sola kaydırma
  const closePan = React.useMemo(() => {
    return Gesture.Pan()
      .enabled(isSidebarOpen)
      .activeOffsetX(-5)
      .failOffsetY(8)
      .onUpdate((e) => {
        'worklet';
        progress.value = clamp(1 + e.translationX / SIDEBAR_WIDTH, 0, 1);
      })
      .onEnd((e) => {
        'worklet';
        const shouldClose = progress.value < 0.6 || e.velocityX < -600;
        if (shouldClose) {
          progress.value = withSpring(0, Springs.smooth);
          runOnJS(closeSidebar)();
        } else {
          progress.value = withSpring(1, Springs.smooth);
        }
      });
  }, [isSidebarOpen, progress, closeSidebar]);

  const closeGesture = Gesture.Simultaneous(closePan, Gesture.Native());

  // AÇMA pan'i - sol kenar şeridi, sadece ana sayfada
  const openPan = React.useMemo(() => {
    return Gesture.Pan()
      .enabled(isTabRoot && !isSidebarOpen)
      .activeOffsetX(10)
      .failOffsetY(8)
      .onUpdate((e) => {
        'worklet';
        progress.value = clamp(e.translationX / SIDEBAR_WIDTH, 0, 1);
      })
      .onEnd((e) => {
        'worklet';
        const shouldOpen = progress.value > 0.4 || e.velocityX > 600;
        if (shouldOpen) {
          progress.value = withSpring(1, Springs.smooth);
          runOnJS(openSidebar)();
        } else {
          progress.value = withSpring(0, Springs.smooth);
        }
      });
  }, [isTabRoot, isSidebarOpen, progress, openSidebar]);

  // ── Animated styles ──
  // Drawer: sabit, hafif parallax drift
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-40, 0], Extrapolation.CLAMP) },
    ],
  }));

  // Ana içerik: sağa kay + hafif küçül + sidebar'a düşen yumuşak gölge
  const mainContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, SIDEBAR_WIDTH], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.93], Extrapolation.CLAMP) },
    ],
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.22], Extrapolation.CLAMP),
    elevation: interpolate(progress.value, [0, 1], [0, 14], Extrapolation.CLAMP),
  }));

  // borderRadius hem gölge (dış) hem clip (iç) katmanında olmalı ki gölge de yuvarlak olsun.
  const mainContentRadiusStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [0, 18], Extrapolation.CLAMP),
  }));

  // Scrim: gri DEĞİL; tema arka plan rengiyle hafif "white shading" (acik temada beyaz),
  // boylece kayan sayfa karartilmaz, sadece hafifce geri cekilmis gibi durur.
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.2], Extrapolation.CLAMP),
  }));

  // ── Handlers ──
  const navigate = useCallback(
    (path: string) => {
      closeSidebar();
      router.push(path as any);
    },
    [closeSidebar, router],
  );

  const handleLogout = useCallback(async () => {
    haptics.impactHeavy();
    closeSidebar();
    await logout();
    setTimeout(() => router.replace('/(auth)/login'), 50);
  }, [closeSidebar, logout, router]);

  const handleLocaleSwitch = useCallback(
    (next: AppLocale) => {
      haptics.selection();
      switchLocale(next);
    },
    [switchLocale],
  );

  const handleThemeSet = useCallback(
    (m: ThemeMode) => {
      haptics.selection();
      setThemeMode(m);
    },
    [setThemeMode],
  );

  const nav = messages.nav;
  const displayName = user?.username ?? '';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ═══ Layer 0: Drawer (altta, sabit) ═══ */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: SIDEBAR_WIDTH,
            backgroundColor: colors.background,
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.sm,
          },
          drawerStyle,
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ── */}
          {isAuthenticated ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                navigate('/(tabs)/profile');
              }}
              style={({ pressed }) => [styles.header, pressed && { opacity: 0.6 }]}
            >
              <Avatar uri={user?.profileImageUrl} name={displayName} size={52} />
              <View style={styles.headerText}>
                <View style={styles.headerNameRow}>
                  <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {user?.role === 'Admin' ? (
                    <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
                  ) : null}
                </View>
                <Text style={[styles.headerHandle, { color: colors.textMuted }]} numberOfLines={1}>
                  @{displayName}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <View style={styles.guestWrap}>
              <View style={styles.guestRow}>
                <View style={[styles.guestAvatar, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="person-outline" size={26} color={colors.textMuted} />
                </View>
                <Text style={[styles.guestTitle, { color: colors.text }]} numberOfLines={2}>
                  {messages.authPrompt.signIn}
                </Text>
              </View>
              <View style={styles.guestButtons}>
                <Pressable
                  onPress={() => navigate('/(auth)/register')}
                  style={({ pressed }) => [
                    styles.guestBtnPrimary,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.guestBtnPrimaryText}>{messages.authPrompt.signUp}</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigate('/(auth)/login')}
                  style={({ pressed }) => [
                    styles.guestBtnGhost,
                    { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.guestBtnGhostText, { color: colors.text }]}>
                    {messages.authPrompt.signIn}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Birincil nav (sadece giriş yapınca) ── */}
          {isAuthenticated && (
            <View style={styles.navGroup}>
              <NavRow icon="bookmark-outline" label={nav.myLists} onPress={() => navigate('/my-lists')} colors={colors} />
              <NavRow icon="heart-outline" label={nav.wishlist} onPress={() => navigate('/wishlist')} colors={colors} />
              <NavRow icon="star-outline" label={nav.favorites} onPress={() => navigate('/favorites')} colors={colors} />
              <NavRow icon="chatbox-ellipses-outline" label={nav.myReviews} onPress={() => navigate('/reviews/user/me')} colors={colors} />
              <NavRow icon="flag-outline" label={nav.myReports} onPress={() => navigate('/my-reports')} colors={colors} />
              {user?.role === 'Admin' ? (
                <NavRow icon="shield-outline" label={nav.adminPanel} onPress={() => navigate('/(admin)/dashboard')} colors={colors} />
              ) : null}
            </View>
          )}

          {isAuthenticated && <View style={[styles.divider, { backgroundColor: colors.border }]} />}

          {/* ── İkincil nav (uygulama) ── */}
          <View style={styles.navGroup}>
            {isAuthenticated && (
              <NavRow icon="settings-outline" label={nav.profileSettings} onPress={() => navigate('/profile/settings')} colors={colors} muted />
            )}
            <NavRow icon="information-circle-outline" label={nav.about} onPress={() => navigate('/about')} colors={colors} muted />
            <NavRow icon="lock-closed-outline" label={nav.privacy} onPress={() => navigate('/privacy')} colors={colors} muted />
            <NavRow icon="document-text-outline" label={nav.terms} onPress={() => navigate('/terms')} colors={colors} muted />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Görünüm + dil (kompakt) ── */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Ionicons name="contrast-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{nav.theme}</Text>
            </View>
            <ThemeControl mode={themeMode} onSet={handleThemeSet} colors={colors} />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelWrap}>
              <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{nav.language}</Text>
            </View>
            <LanguageControl locale={locale} onSwitch={handleLocaleSwitch} colors={colors} />
          </View>

          {/* ── Çıkış ── */}
          {isAuthenticated && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <NavRow icon="log-out-outline" label={nav.logout} onPress={handleLogout} colors={colors} danger />
            </>
          )}

          <Text style={[styles.version, { color: colors.textMuted }]}>{messages.footer.version}</Text>
        </ScrollView>
      </Animated.View>

      {/* ═══ Layer 1: Ana içerik (kayan + scale + sidebar'a düşen gölge) ═══ */}
      <Animated.View
        style={[styles.mainContent, mainContentStyle, mainContentRadiusStyle, { backgroundColor: colors.background }]}
      >
        <Animated.View style={[styles.mainContentClip, mainContentRadiusStyle, { backgroundColor: colors.background }]}>
          {children}

          {/* ═══ Layer 2: Scrim (tema-rengi hafif veil; gri değil) ═══ */}
          <GestureDetector gesture={closeGesture}>
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: colors.background }, scrimStyle]}
              pointerEvents={isSidebarOpen ? 'auto' : 'none'}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>

      {/* ═══ Layer 3: Edge strip - açma (tüm tab köklerinde, kapalıyken) ═══ */}
      {isTabRoot && !isSidebarOpen && (
        <GestureDetector gesture={openPan}>
          <View style={styles.edgeStrip} />
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  /* Drawer */
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerHandle: {
    fontSize: FontSize.md,
  },
  /* Guest */
  guestWrap: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  guestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  guestButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  guestBtnPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  guestBtnPrimaryText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  guestBtnGhost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  guestBtnGhostText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  /* Nav */
  navGroup: {
    gap: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: 2,
  },
  navLabel: {
    fontSize: FontSize.lg + 1,
    fontWeight: '600',
  },
  navLabelMuted: {
    fontSize: FontSize.md + 1,
    fontWeight: '500',
  },
  /* Settings (theme + language) */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  settingLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSize.md + 1,
    fontWeight: '500',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
  },
  segmentBtnWide: {
    paddingHorizontal: 16,
  },
  segmentLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  /* Version */
  version: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  /* Main content */
  mainContent: {
    flex: 1,
    zIndex: 2,
    shadowColor: '#000',
    shadowRadius: 24,
    shadowOffset: { width: -6, height: 3 },
  },
  mainContentClip: {
    flex: 1,
    overflow: 'hidden',
  },
  /* Scrim */
  scrim: {
    zIndex: 3,
  },
  /* Edge strip */
  edgeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_STRIP_WIDTH,
    zIndex: 4,
  },
});
