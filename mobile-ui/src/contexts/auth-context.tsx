import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { useQueryClient } from '@tanstack/react-query';
import {
  setAuthTokens,
  setLogoutCallback,
  setOnTokensRefreshed,
  refreshAccessToken,
  isAuthRejection,
  NoRefreshTokenError,
  type RefreshResult,
} from '@/src/api/client';
import { AuthenticatedUser, JwtPayload, LoginResponse } from '@/src/models/auth';
import { APP_CONFIG } from '@/src/constants/config';

// Tek anahtarda saklanan oturum blob'u: uc ayri setItemAsync yerine atomik tek yazim.
// Boylece Android'de yazimlar arasinda process olurse yarim/bozuk durum kalmaz.
const SESSION_KEY = 'gghub_session';

// Eski surumden migrasyon + temizlik icin legacy anahtarlar.
const LEGACY_ACCESS_KEY = 'gghub_access_token';
const LEGACY_REFRESH_KEY = 'gghub_refresh_token';
const LEGACY_USER_KEY = 'gghub_user';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

function decodeUser(token: string): AuthenticatedUser {
  const payload = jwtDecode<JwtPayload>(token);
  return {
    id: payload.nameid,
    username: payload.unique_name,
    role: payload.role,
    profileImageUrl: payload.picture,
  };
}

// Android Keystore anlik hata verebiliyor; okuma/yazmayi bir kez daha dene.
async function getItemWithRetry(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }
}

async function setItemWithRetry(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ikinci deneme; hala patlarsa cagirana firlatir (login/persist bunu yakalar).
    await SecureStore.setItemAsync(key, value);
  }
}

async function persistSession(session: StoredSession): Promise<void> {
  await setItemWithRetry(SESSION_KEY, JSON.stringify(session));
}

async function clearLegacy(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_ACCESS_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(LEGACY_USER_KEY).catch(() => {}),
  ]);
}

async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
  await clearLegacy();
}

// Once yeni blob'u, yoksa eski uc-anahtar formatini oku (migrasyon). Mevcut giris yapmis
// kullanicilar guncellemede logout OLMAZ.
async function readSession(): Promise<StoredSession | null> {
  const raw = await getItemWithRetry(SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.accessToken && parsed?.refreshToken) return parsed;
    } catch {
      // Bozuk blob -> legacy'e dus.
    }
  }

  const [legacyAccess, legacyRefresh, legacyUser] = await Promise.all([
    getItemWithRetry(LEGACY_ACCESS_KEY),
    getItemWithRetry(LEGACY_REFRESH_KEY),
    getItemWithRetry(LEGACY_USER_KEY),
  ]);

  if (legacyAccess && legacyRefresh) {
    let user: AuthenticatedUser;
    try {
      user = legacyUser ? (JSON.parse(legacyUser) as AuthenticatedUser) : decodeUser(legacyAccess);
    } catch {
      user = decodeUser(legacyAccess);
    }
    const migrated: StoredSession = {
      accessToken: legacyAccess,
      refreshToken: legacyRefresh,
      user,
    };
    try {
      await persistSession(migrated);
      await clearLegacy();
    } catch {
      // Migrasyon yazimi basarisiz olsa da bellekte devam edilir.
    }
    return migrated;
  }

  return null;
}

export interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (response: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileImage: (url: string | null) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  updateProfileImage: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Access token suresi dolmadan kisa sure once proaktif olarak yenile. Sonuc
  // onTokensRefreshed callback'inde islenir (state + persist + yeniden zamanla).
  const scheduleTokenRefresh = useCallback(
    (token: string) => {
      clearRefreshTimer();
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const expiresAt = decoded.exp * 1000;
        const refreshAt = expiresAt - APP_CONFIG.tokenRefreshThresholdMinutes * 60 * 1000;
        const delay = refreshAt - Date.now();

        if (delay > 0) {
          refreshTimerRef.current = setTimeout(() => {
            // Sadece tetikle; single-flight + onTokensRefreshed geri kalanini halleder.
            refreshAccessToken().catch(() => {
              // Gecici hata: sessizce gec. Sonraki gercek istek ya da uygulama
              // one gelince yeniden denenir; oturum SILINMEZ.
            });
          }, delay);
        }
      } catch {
        // Token decode edilemedi.
      }
    },
    [clearRefreshTimer],
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthTokens(null, null);

    await clearSession();

    queryClient.clear();
  }, [clearRefreshTimer, queryClient]);

  const login = useCallback(
    async (response: LoginResponse) => {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response;

      const authenticatedUser = decodeUser(newAccessToken);

      await persistSession({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: authenticatedUser,
      });

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setUser(authenticatedUser);
      setAuthTokens(newAccessToken, newRefreshToken);

      scheduleTokenRefresh(newAccessToken);
    },
    [scheduleTokenRefresh],
  );

  // Avatar degisince auth user'i ve saklanan blob'u senkronla.
  // JWT picture claim'i yeniden uretilmedigi icin sidebar/avatar bu olmadan bayatliyor.
  const updateProfileImage = useCallback(async (url: string | null) => {
    setUser((prev) => (prev ? { ...prev, profileImageUrl: url } : prev));
    try {
      const session = await readSession();
      if (session) {
        await persistSession({
          ...session,
          user: { ...session.user, profileImageUrl: url },
        });
      }
    } catch {
      // Persist basarisiz; state yine de guncellendi.
    }
  }, []);

  // Interceptor VEYA proaktif timer bir refresh tamamladiginda tek yerden isle:
  // state guncelle, blob'a yaz, bir sonraki proaktif yenilemeyi zamanla.
  useEffect(() => {
    setOnTokensRefreshed((result: RefreshResult) => {
      const updatedUser = decodeUser(result.accessToken);
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      setUser(updatedUser);
      setAuthTokens(result.accessToken, result.refreshToken);
      persistSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: updatedUser,
      }).catch(() => {});
      scheduleTokenRefresh(result.accessToken);
    });
  }, [scheduleTokenRefresh]);

  // Uygulama acilisinda oturumu geri yukle.
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const session = await readSession();

        if (session?.accessToken && session?.refreshToken) {
          // client refs'i erkenden doldur ki interceptor/refresh calisabilsin.
          setAuthTokens(session.accessToken, session.refreshToken);

          let isExpired = true;
          try {
            const decoded = jwtDecode<JwtPayload>(session.accessToken);
            isExpired = decoded.exp * 1000 < Date.now();
          } catch {
            // Access token decode edilemiyor -> gercekten gecersiz, temizle.
            await clearSession();
            setAuthTokens(null, null);
            return;
          }

          if (!isExpired) {
            // Access token gecerli: dogrudan geri yukle, ag cagrisi yok.
            setAccessToken(session.accessToken);
            setRefreshToken(session.refreshToken);
            setUser(session.user ?? decodeUser(session.accessToken));
            scheduleTokenRefresh(session.accessToken);
            return;
          }

          // Access token suresi dolmus: yenilemeyi dene.
          try {
            const result = await refreshAccessToken();
            const refreshedUser = decodeUser(result.accessToken);
            await persistSession({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              user: refreshedUser,
            });
            setAccessToken(result.accessToken);
            setRefreshToken(result.refreshToken);
            setUser(refreshedUser);
            scheduleTokenRefresh(result.accessToken);
          } catch (refreshError) {
            if (isAuthRejection(refreshError) || refreshError instanceof NoRefreshTokenError) {
              // Gercek red: refresh token gecersiz/revoked -> temiz logout.
              await clearSession();
              setAuthTokens(null, null);
            } else {
              // GECICI hata (ag hazir degil / timeout): oturumu SILME. Suresi dolmus
              // access token ile de olsa optimistik geri yukle; interceptor ilk gercek
              // istekte yeniden refresh dener. Android cold-start'taki "gecici hatada
              // logout" bug'i boylece biter (iOS'ta zaten yasanmiyordu).
              setAccessToken(session.accessToken);
              setRefreshToken(session.refreshToken);
              setUser(session.user ?? decodeUser(session.accessToken));
            }
          }
        }
      } catch {
        // SecureStore erisimi tamamen basarisiz: oturumu SILME; bir sonraki acilista
        // tekrar denenir.
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, [scheduleTokenRefresh]);

  // Register logout callback with API client
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  const value: AuthContextType = {
    accessToken,
    refreshToken,
    user,
    isLoading,
    isAuthenticated: !!accessToken && !!user,
    login,
    logout,
    updateProfileImage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
