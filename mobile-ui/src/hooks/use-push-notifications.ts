import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from './use-auth';
import { registerForPushNotificationsAsync } from '@/src/utils/push';
import { registerPushToken, unregisterPushToken } from '@/src/api/push';
import { toMobileRoute } from '@/src/utils/route';

/**
 * Registers the device's Expo push token with the backend while signed in, removes it
 * on sign-out, and routes notification taps to the right screen. Mount once near the root.
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  // Register on auth, unregister on sign-out.
  useEffect(() => {
    let cancelled = false;

    if (isAuthenticated) {
      (async () => {
        const token = await registerForPushNotificationsAsync();
        if (cancelled || !token) return;
        tokenRef.current = token;
        try {
          await registerPushToken(token);
        } catch {
          // Best-effort; a failed registration just means no push until next launch.
        }
      })();
    } else {
      const token = tokenRef.current;
      if (token) {
        unregisterPushToken(token).catch(() => {});
        tokenRef.current = null;
      }
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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
