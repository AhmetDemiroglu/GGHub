import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, Springs, Shadows } from '@/src/constants/theme';
import {
  TAB_BAR_CORE_HEIGHT,
  useTabBarBottomInset,
} from '@/src/hooks/use-tab-bar-height';
import * as haptics from '@/src/utils/haptics';

/**
 * Premium custom tab bar.
 * - iOS: BlurView frosted glass + rounded top corners
 * - Android: solid elevated surface
 * - Aktif sekme: filled icon + animasyonlu pill indicator arka plan
 * - Haptics on tab press
 */

// Bottom bar'da görünecek 5 sekme. Hidden route'lar tabBarButton: () => null
// kullandığı için descriptor filtresi güvenilmez; isimle allowlist en sağlamı.
const VISIBLE_TABS = ['index', 'discover', 'search', 'lists', 'profile'];

interface TabConfig {
  name: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
}

function TabButton({
  config,
  isFocused,
  onPress,
  colors,
}: {
  config: TabConfig;
  isFocused: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const scale = useSharedValue(1);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, Springs.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, Springs.bouncy);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          isFocused && { backgroundColor: `${colors.primary}1F` },
          iconWrapStyle,
        ]}
      >
        <Ionicons
          name={isFocused ? config.iconActive : config.icon}
          size={24}
          color={isFocused ? colors.primary : colors.textMuted}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? colors.primary : colors.textMuted,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </Pressable>
  );
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const bottomInset = useTabBarBottomInset();
  const isIOS = Platform.OS === 'ios';

  // Sadece görünür 5 sekme; hidden route'lar tabBarButton: () => null
  // kullandığı için isimle allowlist en sağlamı.
  const visibleRoutes = state.routes.filter((route) =>
    VISIBLE_TABS.includes(route.name),
  );

  const handleTabPress = (routeKey: string, routeName: string, isFocused: boolean) => {
    haptics.impactLight();
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (isFocused || event.defaultPrevented) return;
    navigation.navigate(routeName as any);
  };

  // Tab config - icon + label eşlemesi
  const getTabConfig = (routeName: string, label: string): TabConfig => {
    const map: Record<string, Omit<TabConfig, 'label'>> = {
      index: { name: 'home', icon: 'home-outline', iconActive: 'home' },
      discover: { name: 'discover', icon: 'game-controller-outline', iconActive: 'game-controller' },
      search: { name: 'search', icon: 'search-outline', iconActive: 'search' },
      lists: { name: 'lists', icon: 'list-outline', iconActive: 'list' },
      profile: { name: 'profile', icon: 'person-outline', iconActive: 'person' },
    };
    const cfg = map[routeName] ?? { name: routeName, icon: 'ellipse-outline', iconActive: 'ellipse' };
    return { ...cfg, label };
  };

  const barHeight = TAB_BAR_CORE_HEIGHT + bottomInset;

  return (
    <View
      style={[
        styles.barContainer,
        {
          height: barHeight,
          paddingBottom: bottomInset,
          ...Shadows.lg,
        },
      ]}
    >
      {isIOS ? (
        <BlurView
          intensity={80}
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]}
        />
      )}

      {/* Üst border / köşe yuvarlama için overlay */}
      <View
        style={[
          styles.barInner,
          {
            borderTopColor: `${colors.tabBarBorder}`,
          },
        ]}
      >
        {/* Sekmeler */}
        {visibleRoutes.map((route) => {
          const isFocused = state.index === state.routes.indexOf(route);
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const label =
            descriptor.options.tabBarLabel ?? descriptor.options.title ?? route.name;
          const config = getTabConfig(route.name, String(label));
          return (
            <TabButton
              key={route.key}
              config={config}
              isFocused={isFocused}
              onPress={() => handleTabPress(route.key, route.name, isFocused)}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: 2,
  },
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: FontSize.xs,
  },
});
