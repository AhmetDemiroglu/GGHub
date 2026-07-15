import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from './use-auth';
import { registerForPushNotificationsAsync } from '@/src/utils/push';
import { registerPushToken, unregisterPushToken } from '@/src/api/push';
import { toMobileRoute } from '@/src/utils/route';

// Ilk POST ag nedeniyle duserse oturum boyunca push kaybolmasin diye birkac kez dene.
async function postWithRetry(fn: () => Promise<unknown>, attempts: number): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      return true;
    } catch {
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  return false;
}

/**
 * Registers the device's Expo push token with the backend while signed in, removes it
 * on sign-out, and routes notification taps to the right screen. Mount once near the root.
 *
 * Kayit fire-and-forget degil: yalnizca backend'e BASARIYLA kaydedilen token isaretlenir
 * (retry'li), ve uygulama one geldiginde kayit yeniden dogrulanir. Boylece iOS'ta gorulen
 * "ilk acilista push yok, birkac deneme sonra calisiyor" tutarsizligi ortadan kalkar.
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const registeredTokenRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const ensureRegistered = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token || registeredTokenRef.current === token) return;
      const ok = await postWithRetry(() => registerPushToken(token), 3);
      if (ok) {
        registeredTokenRef.current = token;
      }
    } catch {
      // Best-effort; bir sonraki foreground'da yeniden denenir.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Register on auth, unregister on sign-out.
  useEffect(() => {
    if (isAuthenticated) {
      ensureRegistered();
    } else {
      const token = registeredTokenRef.current;
      if (token) {
        unregisterPushToken(token).catch(() => {});
        registeredTokenRef.current = null;
      }
    }
  }, [isAuthenticated, ensureRegistered]);

  // Uygulama one geldiginde kaydi yeniden dogrula (ilk kayit dustuyse burada tamamlanir).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        ensureRegistered();
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, ensureRegistered]);

  // Navigate when the user taps a notification (background or cold start).
  useEffect(() => {
    const navigateFromResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { link?: string } | undefined;
      const link = data?.link;
      if (link) {
        router.push(toMobileRoute(link) as never);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        navigateFromResponse(response);
      }
    });

    return () => subscription.remove();
  }, [router]);
}
