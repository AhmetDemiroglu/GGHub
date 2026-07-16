import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useAuth } from '@/src/hooks/use-auth';
import { useShell } from '@/src/contexts/shell-context';
import { useUnreadCounts } from '@/src/hooks/use-unread-counts';
import { Avatar } from '@/src/components/common/Avatar';
import { Spacing, FontSize } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

const TOP_BAR_CONTENT_HEIGHT = 44;

interface AppTopBarProps {
  title?: string;
  showLogo?: boolean;
  rightExtra?: React.ReactNode;
  /** translucent blur (oyun detayı / immersive için) */
  blur?: boolean;
  /** Root Stack sayfalarında (tab bar yok) solda menü yerine geri oku göster. */
  showBack?: boolean;
}

function UnreadBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

export function AppTopBar({ title, showLogo = false, rightExtra, blur = false, showBack = false }: AppTopBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { openSidebar } = useShell();
  const router = useRouter();
  // Sayaclar paylasimli react-query cache'inden gelir (global, navigasyonda sifirlanmaz).
  // SignalR context'i ayni anahtarlari canli gunceller; hydrate/foreground refetch tazeler.
  const { unreadMessages, unreadNotifications } = useUnreadCounts();

  const handleMenu = () => {
    haptics.impactLight();
    openSidebar();
  };

  const handleMessages = () => {
    haptics.impactLight();
    router.push('/messages');
  };

  const handleNotifications = () => {
    haptics.impactLight();
    router.push('/notifications');
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          borderBottomColor: colors.tabBarBorder,
          backgroundColor: blur ? 'transparent' : colors.background,
        },
      ]}
    >
      {blur ? (
        <BlurView
          intensity={50}
          tint={colors.background === '#ffffff' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <View style={[styles.inner, { height: TOP_BAR_CONTENT_HEIGHT }]}>
        {/* Sol: Geri (stack sayfaları) veya Avatar / Menü */}
        {showBack ? (
          <TouchableOpacity
            onPress={() => {
              haptics.impactLight();
              if (router.canGoBack()) router.back();
            }}
            style={styles.sideBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color={blur ? '#ffffff' : colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleMenu} style={styles.sideBtn} activeOpacity={0.7}>
            <Avatar uri={user?.profileImageUrl} name={user?.username} size={32} />
          </TouchableOpacity>
        )}

        {/* Orta: Logo veya Başlık */}
        <View style={styles.center} pointerEvents="none">
          {showLogo ? (
            <Image
              source={require('@/assets/images/logo2.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : title ? (
            <Text
              style={[styles.title, { color: blur ? '#ffffff' : colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
        </View>

        {/* Sağ: Extra + Mesajlar + Bildirimler */}
        <View style={styles.rightRow}>
          {rightExtra ? <View style={styles.extraSlot}>{rightExtra}</View> : null}

          <TouchableOpacity
            onPress={handleMessages}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={blur ? '#ffffff' : colors.text}
            />
            <UnreadBadge count={unreadMessages} color={colors.badge} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNotifications}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={blur ? '#ffffff' : colors.text}
            />
            <UnreadBadge count={unreadNotifications} color={colors.badge} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 2 },
      ios: {},
    }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  sideBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  logo: {
    width: 100,
    height: 32,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  extraSlot: {
    marginRight: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
