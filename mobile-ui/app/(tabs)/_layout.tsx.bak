import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/use-auth';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { FontSize } from '@/src/constants/theme';

export default function TabsLayout() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Tab bar her sayfada görünür kalır; sadece icon'u gizlenmiş "hidden tab"lar
  // ile tab bar dışı sayfalar tab navigator altında yönetilir. Bu sayede
  // kullanıcı sidebar veya derin link ile gittiği herhangi bir sayfadan
  // alttaki ana sekmelere tek dokunuşla geri dönebilir.
  const hidden = {
    tabBarButton: () => null as any,
    tabBarItemStyle: { display: 'none' as const },
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          height: 50 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      {/* ── Görünür Sekmeler ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: messages.nav.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: messages.nav.discover,
          tabBarLabel: 'Keşfet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: messages.nav.search,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: messages.nav.lists,
          tabBarLabel: 'Listeler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: messages.nav.profile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          // Profil tab'ına basıldığında nested stack settings/edit'te kalmışsa
          // index'e geri pop'la — kullanıcı tab icon'undan her zaman kendi profile gelsin.
          tabPress: (e) => {
            const state: any = navigation.getState?.();
            const profileRoute = state?.routes?.find((r: any) => r.name === 'profile');
            const hasNestedStack = profileRoute?.state && typeof profileRoute.state.index === 'number';
            if (hasNestedStack && profileRoute.state.index > 0) {
              e.preventDefault();
              navigation.navigate('profile', { screen: 'index' });
            }
          },
        })}
      />

      {/* ── Tab Bar'dan gizli ama tab navigator'a kayıtlı rotalar ── */}
      {/* Top bar icon'larından açılan ekranlar */}
      <Tabs.Screen name="messages" options={{ title: messages.nav.messages, ...hidden }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: messages.nav.notifications, ...hidden }}
      />

      {/* Sidebar'dan açılan kullanıcı ekranları */}
      <Tabs.Screen name="my-lists" options={{ title: messages.nav.myLists, ...hidden }} />
      <Tabs.Screen name="my-reports" options={{ title: messages.nav.myReports, ...hidden }} />
      <Tabs.Screen name="wishlist" options={{ title: messages.nav.wishlist, ...hidden }} />

      {/* Statik içerik */}
      <Tabs.Screen name="about" options={{ title: messages.nav.screenTitles.about, ...hidden }} />
      <Tabs.Screen name="terms" options={{ title: messages.nav.screenTitles.terms, ...hidden }} />
      <Tabs.Screen name="privacy" options={{ title: messages.nav.screenTitles.privacy, ...hidden }} />

      {/* Başka kullanıcı profili & incelemeleri */}
      <Tabs.Screen name="profiles/[username]" options={{ ...hidden }} />
      <Tabs.Screen name="reviews/user/[username]" options={{ ...hidden }} />

      {/* Game detail — immersive hero için tab bar gizlenir */}
      <Tabs.Screen
        name="game/[id]"
        options={{
          ...hidden,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
