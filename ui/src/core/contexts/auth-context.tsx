"use client";

import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { AuthenticatedUser } from "@/models/auth/auth.model";
import { queryClient } from "@core/components/base/providers";
import { setAuthContextRef } from "@core/lib/axios";
import { AppLocale, localeStorageKey } from "@/i18n/config";

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

    useEffect(() => {
        const data = { accessToken, refreshToken, user };
        localStorage.setItem(authStorageKey, JSON.stringify(data));
    }, [accessToken, refreshToken, user]);

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
                    "Accept-Language": localStorage.getItem(localeStorageKey) || locale,
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                throw new Error(`Refresh failed: ${response.status}`);
            }

            const data = await response.json();
            if (!cancelled) {
                login({ accessToken: data.accessToken, refreshToken: data.refreshToken });
            }
        };

        const minutesRemaining = getTokenMinutesRemaining(accessToken);

        // Token zaten suresi dolmussa: once yenilemeyi dene, yalnizca basarisizsa cikis yap.
        // (Onceden dogrudan logout ediliyordu; bu yuzden tarayiciyi 1 saatten sonra acan
        //  kullanici gecerli refresh token'i olsa bile aninda cikis goruyordu.)
        if (minutesRemaining <= 0) {
            doRefresh().catch(() => logout());
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
