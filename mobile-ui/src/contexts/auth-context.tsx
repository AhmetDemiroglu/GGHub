import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance, setAuthTokens, setLogoutCallback } from '@/src/api/client';
import { AuthenticatedUser, JwtPayload, LoginResponse } from '@/src/models/auth';
import { APP_CONFIG } from '@/src/constants/config';

const ACCESS_TOKEN_KEY = 'gghub_access_token';
const REFRESH_TOKEN_KEY = 'gghub_refresh_token';
const USER_KEY = 'gghub_user';

export interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (response: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
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

  const decodeUser = (token: string): AuthenticatedUser => {
    const payload = jwtDecode<JwtPayload>(token);
    return {
      id: payload.nameid,
      username: payload.unique_name,
      role: payload.role,
      profileImageUrl: payload.picture,
    };
  };

  const scheduleTokenRefresh = useCallback(
    (token: string, currentRefreshToken: string) => {
      clearRefreshTimer();
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const expiresAt = decoded.exp * 1000;
        const refreshAt = expiresAt - APP_CONFIG.tokenRefreshThresholdMinutes * 60 * 1000;
        const delay = refreshAt - Date.now();

        if (delay > 0) {
          refreshTimerRef.current = setTimeout(async () => {
            try {
              const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
              const tokenToUse = storedRefreshToken || currentRefreshToken;
              if (!tokenToUse) return;

              const response = await axiosInstance.post('/auth/refresh', {
                token: tokenToUse,
              });
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

              await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
              await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

              const updatedUser = decodeUser(newAccessToken);
              await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));

              setAccessToken(newAccessToken);
              setRefreshToken(newRefreshToken);
              setUser(updatedUser);
              setAuthTokens(newAccessToken, newRefreshToken);

              scheduleTokenRefresh(newAccessToken, newRefreshToken);
            } catch {
              // Refresh failed; the axios interceptor will handle 401s
            }
          }, delay);
        }
      } catch {
        // Token decode failed
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

    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);

    queryClient.clear();
  }, [clearRefreshTimer, queryClient]);

  const login = useCallback(
    async (response: LoginResponse) => {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response;

      const authenticatedUser = decodeUser(newAccessToken);

      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authenticatedUser));

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setUser(authenticatedUser);
      setAuthTokens(newAccessToken, newRefreshToken);

      scheduleTokenRefresh(newAccessToken, newRefreshToken);
    },
    [scheduleTokenRefresh],
  );

  // Load tokens from secure store on mount
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const [storedAccessToken, storedRefreshToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (storedAccessToken && storedRefreshToken) {
          try {
            const decoded = jwtDecode<JwtPayload>(storedAccessToken);
            const isExpired = decoded.exp * 1000 < Date.now();

            if (isExpired) {
              // Token expired, try to refresh
              try {
                const response = await axiosInstance.post('/auth/refresh', {
                  token: storedRefreshToken,
                });
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
                  response.data;

                const refreshedUser = decodeUser(newAccessToken);

                await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
                await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
                await SecureStore.setItemAsync(USER_KEY, JSON.stringify(refreshedUser));

                setAccessToken(newAccessToken);
                setRefreshToken(newRefreshToken);
                setUser(refreshedUser);
                setAuthTokens(newAccessToken, newRefreshToken);
                scheduleTokenRefresh(newAccessToken, newRefreshToken);
              } catch {
                // Refresh failed, clear everything
                await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
                await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
                await SecureStore.deleteItemAsync(USER_KEY);
              }
            } else {
              const parsedUser: AuthenticatedUser = storedUser
                ? JSON.parse(storedUser)
                : decodeUser(storedAccessToken);

              setAccessToken(storedAccessToken);
              setRefreshToken(storedRefreshToken);
              setUser(parsedUser);
              setAuthTokens(storedAccessToken, storedRefreshToken);
              scheduleTokenRefresh(storedAccessToken, storedRefreshToken);
            }
          } catch {
            // Invalid token, clear
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
          }
        }
      } catch {
        // SecureStore access failed
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
