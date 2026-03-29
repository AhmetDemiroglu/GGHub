import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useAuth } from '@/src/hooks/use-auth';
import { useShell } from '@/src/contexts/shell-context';
import { useSignalR } from '@/src/hooks/use-signalr';
import { Avatar } from '@/src/components/common/Avatar';
import { Spacing, FontSize } from '@/src/constants/theme';

const TOP_BAR_CONTENT_HEIGHT = 44;

interface AppTopBarProps {
  title?: string;
  showLogo?: boolean;
  rightExtra?: React.ReactNode;
}

function UnreadBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

export function AppTopBar({ title, showLogo = false, rightExtra }: AppTopBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { openSidebar } = useShell();
  const router = useRouter();
  const { onUnreadMessageCountUpdated, onUnreadNotificationCountUpdated } = useSignalR();

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const unsubMsg = onUnreadMessageCountUpdated((count: unknown) => {
      if (typeof count === 'number') setUnreadMessages(count);
    });
    const unsubNotif = onUnreadNotificationCountUpdated((count: unknown) => {
      if (typeof count === 'number') setUnreadNotifications(count);
    });
    return () => {
      unsubMsg();
      unsubNotif();
    };
  }, [onUnreadMessageCountUpdated, onUnreadNotificationCountUpdated]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.tabBarBorder,
        },
      ]}
    >
      <View style={[styles.inner, { height: TOP_BAR_CONTENT_HEIGHT }]}>
        {/* Sol: Avatar / Menü */}
        <TouchableOpacity onPress={openSidebar} style={styles.sideBtn} activeOpacity={0.7}>
          <Avatar uri={user?.profileImageUrl} name={user?.username} size={32} />
        </TouchableOpacity>

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
              style={[styles.title, { color: colors.text }]}
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
            onPress={() => router.push('/(tabs)/messages')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
            <UnreadBadge count={unreadMessages} color={colors.badge} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
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
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
