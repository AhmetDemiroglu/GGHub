import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AuthProvider } from '@/src/contexts/auth-context';
import { LocaleProvider } from '@/src/contexts/locale-context';
import { ThemeProvider } from '@/src/contexts/theme-context';
import { SignalRProvider } from '@/src/contexts/signalr-context';
import { ShellProvider } from '@/src/contexts/shell-context';
import { ToastProvider } from '@/src/components/common/Toast';
import { ConfirmProvider } from '@/src/components/common/ConfirmDialog';
import { AuthPromptProvider } from '@/src/contexts/auth-prompt-context';
import { AppSidebar } from '@/src/components/shell';
import { useTheme } from '@/src/hooks/use-theme';
import { useAuth } from '@/src/hooks/use-auth';
import { usePushNotifications } from '@/src/hooks/use-push-notifications';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Acilis yolundaki bir await beklenmedik sekilde asilsa bile uygulama acilis logosunda
// sonsuza kadar takili kalmasin diye emniyet subabi. Normal akista oturum SecureStore'dan
// ms'ler icinde okunur ve bu timer hic ates etmez.
const BOOT_FAILSAFE_MS = 2500;

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
  const [bootTimedOut, setBootTimedOut] = useState(false);

  usePushNotifications();

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setBootTimedOut(true), BOOT_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Tek kapi: hem splash'i kaldirir hem <Stack>'i mount eder. Boylece navigator mount
  // olmadan deep-link push'lanmaya calisilmaz (bkz. use-push-notifications flush effect).
  const bootReady = !isLoading || bootTimedOut;

  useEffect(() => {
    if (bootReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootReady]);

  // react-query "focus" kavramini RN AppState'e bagla: uygulama one gelince stale
  // query'ler (okunmamis sayaclari, konusma listesi) otomatik tazelensin. Arka planda
  // dusen SignalR event'leri sonrasi rozetler boylece kendini toparlar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });
    return () => sub.remove();
  }, []);

  if (!bootReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          // iOS: kenardan değil ekranın herhangi bir yerinden sağa çekince geri git.
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="game/[id]" />
        <Stack.Screen name="profiles/[username]" />
        <Stack.Screen name="reviews/user/[username]" />
        {/* Statik segment dinamigi yener: "/reviews/user/x" yukaridaki ekrana,
            "/reviews/123" buraya cozulur. */}
        <Stack.Screen name="reviews/[reviewId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocaleProvider>
            <ThemeProvider>
              <SignalRProvider>
                <ShellProvider>
                  <ToastProvider>
                    <ConfirmProvider>
                      <AuthPromptProvider>
                        <AppSidebar>
                          <RootLayoutNav />
                        </AppSidebar>
                      </AuthPromptProvider>
                    </ConfirmProvider>
                  </ToastProvider>
                </ShellProvider>
              </SignalRProvider>
            </ThemeProvider>
          </LocaleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
