"use client";

import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useQueryClient } from "@tanstack/react-query";
import { AuthenticatedUser } from "@/models/auth/auth.model";
import { setAuthContextRef } from "@core/lib/axios";
import { isAuthRejectionStatus } from "@core/lib/auth-rejection";
import { AppLocale } from "@/i18n/config";
import { getClientLocale } from "@core/lib/client-locale";

interface DecodedToken {
    nameid: string;
    unique_name: string;
    role: "User" | "Admin";
    picture: string;
    exp: number;
}

interface AuthContextValue {
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    user: AuthenticatedUser | null;
    isLoading: boolean;
    login: (tokens: { accessToken: string; refreshToken: string }) => void;
    logout: () => void;
    updateUser: (patch: Partial<AuthenticatedUser>) => void;
    getAuthState: () => { accessToken: string | null; refreshToken: string | null };
}

const authStorageKey = "auth-storage";

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Yenileme HTTP hatasi; durum kodu cikis kararini verir (isAuthRejectionStatus). */
class RefreshFailedError extends Error {
    constructor(public readonly status: number) {
        super(`Refresh failed: ${status}`);
        this.name = "RefreshFailedError";
    }
}

const getTokenMinutesRemaining = (token: string): number => {
    try {
        const decoded = jwtDecode<DecodedToken>(token);
        const now = Date.now() / 1000;
        return Math.floor((decoded.exp - now) / 60);
    } catch {
        return 0;
    }
};

export function AuthProvider({ children, locale }: { children: ReactNode; locale: AppLocale }) {
    // AuthProvider artık QueryClientProvider'ın İÇİNDE mount ediliyor (providers.tsx), bu
    // yüzden modül seviyesindeki singleton yerine context'teki client kullanılabiliyor.
    const queryClient = useQueryClient();
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(authStorageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            setAccessToken(parsed.accessToken);
            setRefreshToken(parsed.refreshToken);
            setUser(parsed.user);
        }
        setIsLoading(false);
    }, []);

    // Ilk okuma bitmeden YAZMA. Eskiden bu efekt ilk render'da bos state'i (null, null, null)
    // localStorage'a yaziyor, bir sonraki render'da okunan degerleri geri koyuyordu. Sekmeler
    // arasi senkron eklendigi icin o gecici null yazimi diger sekmeleri cikisa dusururdu.
    useEffect(() => {
        if (isLoading) return;
        const data = { accessToken, refreshToken, user };
        localStorage.setItem(authStorageKey, JSON.stringify(data));
    }, [accessToken, refreshToken, user, isLoading]);

    // Sekmeler arasi senkron. Refresh token TEK KULLANIMLIK (backend her yenilemede eskisini
    // iptal eder). Iki sekme acikken A yenileyince B'nin bellekteki token'i gecersiz kaliyor,
    // B'nin ilk yenilemesi 401 aliyor ve kullanici o sekmede sebepsiz cikisa dusuyordu.
    // "storage" olayi yalniz DIGER sekmelerde tetiklenir, yazan sekme kendini tekrar tetiklemez.
    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== authStorageKey) return;
            if (!event.newValue) {
                setAccessToken(null);
                setRefreshToken(null);
                setUser(null);
                return;
            }
            try {
                const parsed = JSON.parse(event.newValue);
                // Esit degerde state degistirme: aksi halde bu sekme ayni veriyi yeniden yazar.
                setAccessToken((prev) => (prev === (parsed.accessToken ?? null) ? prev : parsed.accessToken ?? null));
                setRefreshToken((prev) => (prev === (parsed.refreshToken ?? null) ? prev : parsed.refreshToken ?? null));
                setUser((prev) => (JSON.stringify(prev) === JSON.stringify(parsed.user ?? null) ? prev : parsed.user ?? null));
            } catch {
                // Bozuk kayit: bu sekmenin durumu degismez, bir sonraki yazim duzeltir.
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const login = ({ accessToken: nextAccessToken, refreshToken: nextRefreshToken }: { accessToken: string; refreshToken: string }) => {
        const decodedToken = jwtDecode<DecodedToken>(nextAccessToken);
        setAccessToken(nextAccessToken);
        setRefreshToken(nextRefreshToken);
        setUser({
            id: decodedToken.nameid,
            username: decodedToken.unique_name,
            role: decodedToken.role,
            profileImageUrl: decodedToken.picture || null,
        });
    };

    const logout = () => {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        localStorage.removeItem(authStorageKey);
        queryClient.clear();
    };

    // JWT'den türetilen kullanıcı bilgilerini (ör. profil fotoğrafı) access token
    // yenilenmeden güncellemek için. localStorage persistence useEffect'i tarafından otomatik kaydedilir.
    const updateUser = (patch: Partial<AuthenticatedUser>) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    // Token refresh, axios interceptor tarafından 401 yanıtında otomatik yapılıyor.
    // Ek olarak, token süresi dolmak üzereyse proaktif refresh yapalım (tek seferlik kontrol).
    useEffect(() => {
        if (!accessToken || !refreshToken) return;

        let cancelled = false;

        // Refresh token ile yeni access token al. Basarisizsa hata firlatir.
        const doRefresh = async () => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": getClientLocale() || locale,
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                throw new RefreshFailedError(response.status);
            }

            const data = await response.json();
            if (!cancelled) {
                login({ accessToken: data.accessToken, refreshToken: data.refreshToken });
            }
        };

        const minutesRemaining = getTokenMinutesRemaining(accessToken);

        // Token zaten suresi dolmussa: once yenilemeyi dene, YALNIZCA gercek kimlik reddinde
        // cikis yap. Ag hatasi, timeout, 429 ya da 5xx'te oturum korunur; axios interceptor bir
        // sonraki 401'de yeniden dener. (Onceden her hata cikisa donusuyordu: API'nin yavas
        // oldugu her an gecerli oturumlu kullaniciyi disari atiyordu.)
        if (minutesRemaining <= 0) {
            doRefresh().catch((error) => {
                if (error instanceof RefreshFailedError && isAuthRejectionStatus(error.status)) {
                    logout();
                }
            });
            return () => {
                cancelled = true;
            };
        }

        // Token expire olmadan 2 dk once refresh planla.
        const msUntilRefresh = Math.max((minutesRemaining - 2) * 60 * 1000, 0);
        const timer = setTimeout(() => {
            // Hata olursa axios interceptor bir sonraki 401'de yeniden dener.
            doRefresh().catch((error) => {
                console.error("Proactive token refresh failed:", error);
            });
        }, msUntilRefresh);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [accessToken, refreshToken, locale]);

    const value = useMemo<AuthContextValue>(
        () => ({
            accessToken,
            refreshToken,
            isAuthenticated: !!accessToken && !!user,
            user,
            isLoading,
            login,
            logout,
            updateUser,
            getAuthState: () => ({ accessToken, refreshToken }),
        }),
        [accessToken, refreshToken, user, isLoading]
    );

    useEffect(() => {
        setAuthContextRef(value);
    }, [value]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
