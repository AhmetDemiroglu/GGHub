import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/use-auth';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { AppTabBar } from '@/src/components/shell/AppTabBar';
import { FontSize } from '@/src/constants/theme';

/**
 * X mimarisi: Tabs navigator YALNIZCA 5 gerçek sekme kökünü barındırır.
 * Detay/ikincil ekranların tamamı (mesajlar, bildirimler, liste detayı,
 * ayarlar, statik sayfalar...) root Stack'te yaşar; böylece hepsi kayarak
 * açılır, iOS'ta native interaktif geri jesti alır ve geri dönüş animasyonlu olur.
 */
export default function TabsLayout() {
  const { isLoading } = useAuth();
  const { colors } = useTheme();
  const { messages } = useLocale();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { display: 'none' },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '500',
        },
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: messages.nav.home,
          tabBarLabel: messages.nav.tabs.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: messages.nav.discover,
          tabBarLabel: messages.nav.tabs.discover,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: messages.nav.search,
          tabBarLabel: messages.nav.tabs.search,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: messages.nav.lists,
          tabBarLabel: messages.nav.tabs.lists,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: messages.nav.profile,
          tabBarLabel: messages.nav.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
