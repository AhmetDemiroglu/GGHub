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
  withTiming,
  runOnJS,
  interpolate,
  clamp,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);
const EDGE_STRIP_WIDTH = 24;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ───────────────────────── Nav Item ───────────────────────── */
interface NavItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  colors: ThemeColors;
}

function NavItem({ icon, label, onPress, danger = false, colors }: NavItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    haptics.selection();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.97, Springs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Springs.snappy);
      }}
      style={[styles.navItem, { backgroundColor: colors.surface }, animatedStyle]}
    >
      <View
        style={[
          styles.navIconWrap,
          { backgroundColor: danger ? `${colors.error}18` : `${colors.primary}18` },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <Text
        style={[styles.navLabel, { color: danger ? colors.error : colors.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </AnimatedPressable>
  );
}

/* ───────────────────────── Section Header ───────────────────────── */
function SectionHeader({ label, colors }: { label: string; colors: ThemeColors }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border, flex: 1 }]} />
    </View>
  );
}

/* ───────────────────────── Flag Pill (Language) ───────────────────────── */
function LanguagePill({
  locale,
  onSwitch,
  colors,
}: {
  locale: AppLocale;
  onSwitch: (l: AppLocale) => void;
  colors: ThemeColors;
}) {
  const options: { key: AppLocale; flag: string; label: string }[] = [
    { key: 'tr', flag: '🇹🇷', label: 'TR' },
    { key: 'en-US', flag: '🇬🇧', label: 'EN' },
  ];

  return (
    <View style={[styles.pillContainer, { backgroundColor: colors.surfaceHighlight }]}>
      {options.map((opt) => {
        const active = locale === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[
              styles.pillOption,
              active && { backgroundColor: colors.primary, ...Shadows.sm },
            ]}
            onPress={() => {
              if (!active) {
                haptics.selection();
                onSwitch(opt.key);
              }
            }}
          >
            <Text style={styles.pillFlag}>{opt.flag}</Text>
            <Text
              style={[
                styles.pillLabel,
                { color: active ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Theme Segmented ───────────────────────── */
function ThemeSegmented({
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
    <View style={[styles.pillContainer, { backgroundColor: colors.surfaceHighlight }]}>
      {options.map((opt) => {
        const active = mode === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[
              styles.pillOption,
              styles.pillOptionSquare,
              active && { backgroundColor: colors.primary, ...Shadows.sm },
            ]}
            onPress={() => {
              if (!active) {
                haptics.selection();
                onSet(opt.key);
              }
            }}
          >
            <Ionicons
              name={opt.icon}
              size={18}
              color={active ? '#ffffff' : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Main Sidebar (X-style parallax) ─────────────────────────
 * Mimari: 3 katman, tek `progress` shared value [0=kapalı, 1=açık]
 *  - Drawer (altta, sabit): parallax drift
 *  - Ana içerik (kayan): translateX + scale + borderRadius + shadow
 *  - Scrim (ana içerik üstünde): tap/swipe-to-close
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

  // progress: 0 = kapalı, 1 = açık
  const progress = useSharedValue(0);

  // Ana sayfa tespiti - edge-swipe sadece ana sayfada
  const isHome = pathname === '/';

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

  // KAPATMA pan'i - scrim üzerinde (ana içerik alanı), sola kaydırma
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

  // closePan + Native (tap-to-close Pressable ile uyumlu)
  const closeGesture = Gesture.Simultaneous(closePan, Gesture.Native());

  // AÇMA pan'i - sol kenar şeridi, sadece ana sayfada
  const openPan = React.useMemo(() => {
    return Gesture.Pan()
      .enabled(isHome && !isSidebarOpen)
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
  }, [isHome, isSidebarOpen, progress, openSidebar]);

  // ── Animated styles ──
  // Drawer: sabit, hafif parallax drift
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-40, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  // Ana içerik: sağa kay + küçül + yuvarlak köşe + gölge
  const mainContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, SIDEBAR_WIDTH], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.93], Extrapolation.CLAMP) },
    ],
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.3], Extrapolation.CLAMP),
    elevation: interpolate(progress.value, [0, 1], [0, 14], Extrapolation.CLAMP),
  }));

  // borderRadius hem gölge (dış) hem clip (iç) katmanında olmalı ki gölge de
  // yuvarlak olsun. iOS'ta overflow:'hidden' gölgeyi kırptığı için ikiye ayırdık.
  const mainContentRadiusStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(progress.value, [0, 1], [0, 16], Extrapolation.CLAMP),
  }));

  // Scrim: ana içerik üzerinde karartma
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.5], Extrapolation.CLAMP),
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
    <View style={styles.root}>
      {/* ═══ Layer 0: Drawer (altta, sabit) ═══ */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: SIDEBAR_WIDTH,
            backgroundColor: colors.background,
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: insets.bottom,
          },
          drawerStyle,
        ]}
      >
        {/* Close button */}
        <Pressable
          style={[styles.closeBtn, { top: insets.top + Spacing.sm }]}
          onPress={() => {
            haptics.impactLight();
            closeSidebar();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── User Card ── */}
          {isAuthenticated ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                navigate('/(tabs)/profile');
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.userCard}
              >
                <View style={styles.userCardTop}>
                  <Avatar uri={user?.profileImageUrl} name={displayName} size={56} />
                  <View style={styles.userInfo}>
                    <Text style={styles.username} numberOfLines={1}>
                      {user?.username ?? '-'}
                    </Text>
                    {user?.role === 'Admin' ? (
                      <View style={styles.roleBadge}>
                        <Ionicons name="shield" size={11} color="#ffffff" />
                        <Text style={styles.roleBadgeText}>Admin</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={[styles.guestCard, { backgroundColor: colors.surface }]}>
              <View style={styles.guestAvatarWrap}>
                <Ionicons name="person-outline" size={28} color={colors.textMuted} />
              </View>
              <View style={styles.guestInfo}>
                <Text style={[styles.guestTitle, { color: colors.text }]}>
                  {messages.authPrompt.signIn}
                </Text>
                <Pressable
                  onPress={() => navigate('/(auth)/register')}
                  style={({ pressed }) => [
                    styles.guestCta,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.guestCtaText}>{messages.authPrompt.signUp}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => navigate('/(auth)/login')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* ── Quick Settings ── */}
          <View style={styles.section}>
            <SectionHeader label={nav.theme} colors={colors} />
            <ThemeSegmented mode={themeMode} onSet={handleThemeSet} colors={colors} />

            <View style={{ height: Spacing.md }} />

            <SectionHeader label={nav.language} colors={colors} />
            <LanguagePill locale={locale} onSwitch={handleLocaleSwitch} colors={colors} />
          </View>

          {/* ── Main Navigation ── */}
          {isAuthenticated && (
            <View style={styles.section}>
              <SectionHeader label={nav.profile} colors={colors} />
              <View style={styles.navGroup}>
                <NavItem icon="list-outline" label={nav.myLists} onPress={() => navigate('/my-lists')} colors={colors} />
                <NavItem icon="heart-outline" label={nav.wishlist} onPress={() => navigate('/wishlist')} colors={colors} />
                <NavItem icon="star-outline" label={nav.myReviews} onPress={() => navigate('/reviews/user/me')} colors={colors} />
                <NavItem icon="flag-outline" label={nav.myReports} onPress={() => navigate('/my-reports')} colors={colors} />
                {user?.role === 'Admin' ? (
                  <NavItem icon="shield-outline" label={nav.adminPanel} onPress={() => navigate('/(admin)/dashboard')} colors={colors} />
                ) : null}
              </View>
            </View>
          )}

          {/* ── App ── */}
          <View style={styles.section}>
            <SectionHeader label={messages.common.appName} colors={colors} />
            <View style={styles.navGroup}>
              {isAuthenticated && (
                <NavItem icon="settings-outline" label={nav.profileSettings} onPress={() => navigate('/profile/settings')} colors={colors} />
              )}
              <NavItem icon="information-circle-outline" label={nav.about} onPress={() => navigate('/about')} colors={colors} />
              <NavItem icon="document-text-outline" label={nav.privacy} onPress={() => navigate('/privacy')} colors={colors} />
              <NavItem icon="document-text-outline" label={nav.terms} onPress={() => navigate('/terms')} colors={colors} />
            </View>
          </View>

          {/* ── Logout ── */}
          {isAuthenticated && (
            <View style={[styles.section, { marginTop: Spacing.sm }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  { backgroundColor: `${colors.error}14`, borderColor: `${colors.error}30` },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={[styles.logoutText, { color: colors.error }]}>
                  {nav.logout}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Footer version */}
          <View style={styles.footerWrap}>
            <Text style={[styles.footerVersion, { color: colors.textMuted }]}>
              {messages.footer.version}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* ═══ Layer 1: Ana içerik (kayan + scale + shadow) ═══ */}
      <Animated.View style={[styles.mainContent, mainContentStyle, mainContentRadiusStyle]}>
        <Animated.View style={[styles.mainContentClip, mainContentRadiusStyle]}>
          {children}

          {/* ═══ Layer 2: Scrim (ana içerik üstünde, tap/swipe-to-close) ═══ */}
          <GestureDetector gesture={closeGesture}>
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}
              pointerEvents={isSidebarOpen ? 'auto' : 'none'}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>

      {/* ═══ Layer 3: Edge strip - açma (sadece ana sayfada, kapalıyken) ═══ */}
      {isHome && !isSidebarOpen && (
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
    backgroundColor: '#000',
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
  closeBtn: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  /* User card */
  userCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  /* Guest card */
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  guestAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  guestInfo: {
    flex: 1,
    gap: Spacing.sm,
  },
  guestTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  guestCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  guestCtaText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  /* Section */
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionHeaderLine: {
    height: StyleSheet.hairlineWidth,
    width: Spacing.sm,
  },
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  navGroup: {
    gap: Spacing.xs,
  },
  /* Nav item */
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  /* Pills */
  pillContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    gap: 4,
  },
  pillOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  pillOptionSquare: {
    paddingVertical: Spacing.sm + 2,
  },
  pillFlag: {
    fontSize: FontSize.lg,
  },
  pillLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  /* Logout */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  /* Footer */
  footerWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerVersion: {
    fontSize: FontSize.xs,
  },
  /* Main content */
  mainContent: {
    flex: 1,
    zIndex: 2,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowRadius: 20,
    shadowOffset: { width: -8, height: 0 },
  },
  mainContentClip: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  /* Scrim */
  scrim: {
    zIndex: 3,
    backgroundColor: '#000',
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
