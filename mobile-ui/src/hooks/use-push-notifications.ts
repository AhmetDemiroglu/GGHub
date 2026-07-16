import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { registerForPushNotificationsAsync } from '@/src/utils/push';
import { registerPushToken, unregisterPushToken } from '@/src/api/push';
import { markNotificationAsRead } from '@/src/api/notifications';
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
  const queryClient = useQueryClient();
  const rootNavigationState = useRootNavigationState();
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<number | null>(null);
  const registeredTokenRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  // Kok <Stack> mount olunca navigation state'in key'i tanimli olur; oncesinde undefined.
  const isNavigationReady = !!rootNavigationState?.key;

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

  // Bildirime dokunulunca linki HEMEN push etme, kuyruga al (background + cold start).
  // Cold-start'ta bu callback, kok <Stack> daha mount olmadan cok once cagriliyordu;
  // navigator yokken router.push "navigate before mounting the Root Layout" hatasi atip
  // link sessizce kayboluyordu (uygulama varsayilan sekmeye aciliyordu). Artik link
  // bekletilir, asagidaki flush effect router hazir olunca uygular.
  useEffect(() => {
    const queueFromResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { link?: string; notificationId?: number }
        | undefined;
      if (data?.link) {
        setPendingLink(data.link);
      }
      // Ayri kuyruk: link'ten farkli olarak bu, oturum acilana kadar beklemeli (bkz. asagi).
      if (typeof data?.notificationId === 'number') {
        setPendingNotificationId(data.notificationId);
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(queueFromResponse);

    // Cold start: uygulamayi acan bildirim.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          queueFromResponse(response);
        }
      })
      .catch(() => {});

    return () => subscription.remove();
  }, []);

  // Router hazir olur olmaz bekleyen linki bir kez uygula. Auth'a BAGLAMA: public
  // deep-link'ler (game/profile) oturumsuz da acilmali, korumali ekranlar zaten kendi
  // icinde AuthRequiredView gosteriyor.
  useEffect(() => {
    if (!isNavigationReady || !pendingLink) return;
    setPendingLink(null);
    router.push(toMobileRoute(pendingLink) as never);
  }, [isNavigationReady, pendingLink, router]);

  // Push'a dokunulan bildirimi okundu yap. Eskiden push'tan icerige gidince rozet
  // dusmuyordu; okundu olmasi icin zil ekranini tekrar acmak gerekiyordu.
  //
  // Link kuyrugundan AYRI ve isAuthenticated'a bagli tutuluyor: link'ler oturumsuz da
  // acilabilmeli (public deep-link), ama mark-read auth ister ve oturum yokken 401 doner.
  // Ikisini ayni effect'e koymak, oturum acilana kadar navigasyonu da bekletirdi.
  useEffect(() => {
    if (!isAuthenticated || pendingNotificationId === null) return;
    const notificationId = pendingNotificationId;
    setPendingNotificationId(null);

    markNotificationAsRead(notificationId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      })
      // Best-effort: 404 (silinmis ya da bana ait olmayan bildirim) sessizce gecilir.
      .catch(() => {});
  }, [isAuthenticated, pendingNotificationId, queryClient]);
}
