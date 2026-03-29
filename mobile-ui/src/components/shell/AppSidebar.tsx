import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Avatar } from '@/src/components/common/Avatar';
import { useShell } from '@/src/contexts/shell-context';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import type { AppLocale } from '@/src/i18n';

const SIDEBAR_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);
const ANIM_DURATION = 240;

interface NavItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function NavItem({ icon, label, onPress, danger = false, colors }: NavItemProps) {
  return (
    <TouchableOpacity
      style={[styles.navItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.error : colors.textSecondary}
        style={styles.navIcon}
      />
      <Text style={[styles.navLabel, { color: danger ? colors.error : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface SectionHeaderProps {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SectionHeader({ label, colors }: SectionHeaderProps) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{label}</Text>
  );
}

export function AppSidebar() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { locale, switchLocale, messages } = useLocale();
  const { user, logout } = useAuth();
  const { isSidebarOpen, closeSidebar } = useShell();
  const router = useRouter();

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSidebarOpen) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSidebarOpen, translateX, overlayOpacity]);

  const navigate = useCallback(
    (path: string) => {
      closeSidebar();
      setTimeout(() => router.push(path as any), 50);
    },
    [closeSidebar, router],
  );

  const handleLogout = useCallback(async () => {
    closeSidebar();
    await logout();
    setTimeout(() => router.replace('/(auth)/login'), 50);
  }, [closeSidebar, logout, router]);

  const toggleLocale = useCallback(() => {
    const next: AppLocale = locale === 'tr' ? 'en-US' : 'tr';
    switchLocale(next);
  }, [locale, switchLocale]);

  const nav = messages.nav;

  return (
    <Modal
      visible={isSidebarOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSidebar}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: SIDEBAR_WIDTH,
            backgroundColor: colors.surface,
            transform: [{ translateX }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {/* Kapat butonu */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + Spacing.sm }]}
          onPress={closeSidebar}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Kullanıcı Kartı */}
          <View style={[styles.userCard, { borderBottomColor: colors.border }]}>
            <Avatar uri={user?.profileImageUrl} name={user?.username} size={56} />
            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: colors.text }]}>
                {user?.username ?? '—'}
              </Text>
              {user?.role === 'Admin' ? (
                <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.roleBadgeText}>Admin</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Ana Navigasyon */}
          <View style={styles.section}>
            <NavItem
              icon="list-outline"
              label={nav.myLists}
              onPress={() => navigate('/my-lists')}
              colors={colors}
            />
            <NavItem
              icon="heart-outline"
              label={nav.wishlist}
              onPress={() => navigate('/wishlist')}
              colors={colors}
            />
            <NavItem
              icon="star-outline"
              label={nav.myReviews}
              onPress={() => navigate('/reviews/user/me')}
              colors={colors}
            />
            <NavItem
              icon="flag-outline"
              label={nav.myReports}
              onPress={() => navigate('/my-reports')}
              colors={colors}
            />
            {user?.role === 'Admin' ? (
              <NavItem
                icon="shield-outline"
                label={nav.adminPanel}
                onPress={() => navigate('/(admin)/dashboard')}
                colors={colors}
              />
            ) : null}
          </View>

          {/* Hızlı Ayarlar */}
          <View style={[styles.section, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <SectionHeader label={nav.theme} colors={colors} />
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={colors.textSecondary}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, { color: colors.text }]}>
                {isDark ? 'Dark' : 'Light'}
              </Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <SectionHeader label={nav.language} colors={colors} />
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <Ionicons
                name="language-outline"
                size={20}
                color={colors.textSecondary}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, { color: colors.text }]}>
                {locale === 'tr' ? 'Türkçe 🇹🇷' : 'English 🇺🇸'}
              </Text>
              <Switch
                value={locale === 'tr'}
                onValueChange={toggleLocale}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Uygulama */}
          <View style={[styles.section, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <NavItem
              icon="settings-outline"
              label={nav.profileSettings}
              onPress={() => navigate('/profile/settings')}
              colors={colors}
            />
            <NavItem
              icon="information-circle-outline"
              label="Hakkında"
              onPress={() => navigate('/about')}
              colors={colors}
            />
            <NavItem
              icon="document-text-outline"
              label="Gizlilik"
              onPress={() => navigate('/privacy')}
              colors={colors}
            />
          </View>

          {/* Çıkış */}
          <View style={[styles.section, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <NavItem
              icon="log-out-outline"
              label={nav.logout}
              onPress={handleLogout}
              danger
              colors={colors}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 1,
    padding: Spacing.xs,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  username: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  section: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navIcon: {
    width: 22,
  },
  navLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
