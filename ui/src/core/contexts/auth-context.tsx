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
}

interface AuthContextValue {
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    user: AuthenticatedUser | null;
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

    useEffect(() => {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            setAccessToken(parsed.accessToken);
            setRefreshToken(parsed.refreshToken);
            setUser(parsed.user);
        }
    }, []);

    useEffect(() => {
        const data = {
            accessToken,
            refreshToken,
            user,
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    }, [accessToken, refreshToken, user]);

    const login = ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
        const decodedToken = jwtDecode<DecodedToken>(accessToken);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setUser({
            id: decodedToken.nameid,
            username: decodedToken.unique_name,
            role: decodedToken.role,
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
        login,
        logout,
        getAuthState,
    };

    useEffect(() => {
        setAuthContextRef(value);
    }, [value]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
