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

    // Token refresh, axios interceptor tarafından 401 yanıtında otomatik yapılıyor.
    // Ek olarak, token süresi dolmak üzereyse proaktif refresh yapalım (tek seferlik kontrol).
    useEffect(() => {
        if (!accessToken || !refreshToken) return;

        const minutesRemaining = getTokenMinutesRemaining(accessToken);
        if (minutesRemaining <= 0) {
            // Token zaten expired, logout
            logout();
            return;
        }

        // Token expire olmadan 2 dk önce refresh planla
        const msUntilRefresh = Math.max((minutesRemaining - 2) * 60 * 1000, 0);
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept-Language": localStorage.getItem(localeStorageKey) || locale,
                    },
                    body: JSON.stringify({ token: refreshToken }),
                });

                if (response.ok) {
                    const data = await response.json();
                    login({ accessToken: data.accessToken, refreshToken: data.refreshToken });
                }
            } catch (error) {
                console.error("Proactive token refresh failed:", error);
            }
        }, msUntilRefresh);

        return () => clearTimeout(timer);
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
            getAuthState: () => ({ accessToken, refreshToken }),
        }),
        [accessToken, refreshToken, user, isLoading]
    );

    useEffect(() => {
        setAuthContextRef(value);
    }, [value]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
