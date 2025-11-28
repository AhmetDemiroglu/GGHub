"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { AuthenticatedUser } from "@/models/auth/auth.model";
import { queryClient } from "@core/components/base/providers";
import { setAuthContextRef } from "@core/lib/axios";

interface DecodedToken {
    nameid: string;
    unique_name: string;
    role: "User" | "Admin";
    picture: string;
    exp: number;
}

function getTokenMinutesRemaining(token: string): number {
    try {
        const decoded = jwtDecode<DecodedToken>(token);
        const now = Date.now() / 1000;
        return Math.floor((decoded.exp - now) / 60);
    } catch {
        return 0;
    }
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

export const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STORAGE_KEY = "auth-storage";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            setAccessToken(parsed.accessToken);
            setRefreshToken(parsed.refreshToken);
            setUser(parsed.user);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const data = {
            accessToken,
            refreshToken,
            user,
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    }, [accessToken, refreshToken, user]);

    useEffect(() => {
        if (!accessToken || !refreshToken) return;

        const checkAndRefresh = async () => {
            const minutesRemaining = getTokenMinutesRemaining(accessToken);

            if (minutesRemaining > 0 && minutesRemaining < 10) {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/refresh`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ token: refreshToken }),
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        login({ accessToken: data.accessToken, refreshToken: data.refreshToken });
                    }
                } catch (error) {
                    console.error("Token refresh failed:", error);
                }
            }
        };

        const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);
        checkAndRefresh();

        return () => clearInterval(interval);
    }, [accessToken, refreshToken]);

    const login = ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
        const decodedToken = jwtDecode<DecodedToken>(accessToken);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
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
        localStorage.removeItem(AUTH_STORAGE_KEY);
        queryClient.clear();
    };

    const getAuthState = () => ({
        accessToken,
        refreshToken,
    });

    const value: AuthContextValue = {
        accessToken,
        refreshToken,
        isAuthenticated: !!accessToken && !!user,
        user,
        isLoading,
        login,
        logout,
        getAuthState,
    };

    useEffect(() => {
        setAuthContextRef(value);
    }, [value]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
