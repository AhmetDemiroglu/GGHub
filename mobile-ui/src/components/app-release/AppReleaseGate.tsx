import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { checkAppRelease } from '@/src/api/app-release';
import type { AppReleaseCheck } from '@/src/models/app-release';
import { getAppVersion } from '@/src/utils/app-version';
import { BlockedScreen } from './BlockedScreen';
import { UpdateAvailableModal } from './UpdateAvailableModal';

/** Acilista sunucu cevabini en fazla bu kadar bekle; gec gelirse uygulama acilir, karar sonra uygulanir. */
const HOLD_MS = 1500;
/** One gelince en erken bu aralikla yeniden sor. */
const RECHECK_MS = 60_000;
/** "Sonra" denen guncelleme penceresi en erken bu kadar sonra tekrar gosterilir (soguk acilis hep gosterir). */
const REMIND_MS = 24 * 60 * 60 * 1000;

/**
 * Uygulama kapisi. Sunucuya platform + surum sorar:
 *   - maintenance / required  -> cocuklar (navigator) yerine BlockedScreen.
 *   - recommended             -> cocuklar + kapatilabilir "yeni surum" penceresi.
 *   - ok / ag hatasi          -> cocuklar (kapi ASLA hata yuzunden kilitlemez).
 * One gelislerde yeniden sorar; admin bakimi acinca calisan uygulamalar da kapiya duser.
 */
export function AppReleaseGate({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AppReleaseCheck | null>(null);
  const [settled, setSettled] = useState(Platform.OS === 'web');
  const [promptVisible, setPromptVisible] = useState(false);
  const lastCheckAt = useRef(0);
  const lastDismissAt = useRef(0);

  const runCheck = useCallback(async () => {
    lastCheckAt.current = Date.now();
    try {
      const next = await checkAppRelease(Platform.OS, getAppVersion());
      setResult(next);
      if (next.status === 'recommended' && Date.now() - lastDismissAt.current > REMIND_MS) {
        setPromptVisible(true);
      }
      if (next.status !== 'recommended') setPromptVisible(false);
    } catch {
      // Ag yok / sunucu yok: son bilinen karar kalir, ilk acilista "ok" varsayilir.
    }
  }, []);

  // Ilk kontrol: splash'i en fazla HOLD_MS tut.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => setSettled(true), HOLD_MS);
    runCheck().finally(() => {
      clearTimeout(timer);
      setSettled(true);
    });
    return () => clearTimeout(timer);
  }, [runCheck]);

  // One gelince yeniden sor (bakim acildi mi, guncelleme yapildi mi).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active' && Date.now() - lastCheckAt.current > RECHECK_MS) {
        void runCheck();
      }
    });
    return () => sub.remove();
  }, [runCheck]);

  const blocked = result?.status === 'maintenance' || result?.status === 'required';

  // Kapali kapida navigator mount olmaz; splash'i burada kaldir.
  useEffect(() => {
    if (settled && blocked) SplashScreen.hideAsync().catch(() => {});
  }, [settled, blocked]);

  if (!settled) return null;

  if (blocked && result) {
    return <BlockedScreen result={result} onRetry={runCheck} />;
  }

  return (
    <>
      {children}
      <UpdateAvailableModal
        result={result}
        visible={promptVisible}
        onDismiss={() => {
          lastDismissAt.current = Date.now();
          setPromptVisible(false);
        }}
      />
    </>
  );
}
