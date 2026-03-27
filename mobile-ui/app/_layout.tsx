import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/src/contexts/auth-context';
import { LocaleProvider } from '@/src/contexts/locale-context';
import { ThemeProvider } from '@/src/contexts/theme-context';
import { SignalRProvider } from '@/src/contexts/signalr-context';
import { ToastProvider } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useAuth } from '@/src/hooks/use-auth';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function RootLayoutNav() {
  const { isDark } = useTheme();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="profiles/[username]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="my-reports" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="about" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="terms" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="lists/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="lists/[listId]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="my-lists" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="wishlist" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="reviews/user/[username]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <ThemeProvider>
            <SignalRProvider>
              <ToastProvider>
                <RootLayoutNav />
              </ToastProvider>
            </SignalRProvider>
          </ThemeProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
