import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors, ThemeColors } from '@/src/constants/theme';

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'gghub_theme';

export interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: true,
  colors: Colors.dark,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  const resolvedDark =
    themeMode === 'system'
      ? systemScheme === 'dark' || systemScheme === null
      : themeMode === 'dark';

  const colors = resolvedDark ? Colors.dark : Colors.light;

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage write failed
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = resolvedDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [resolvedDark, setThemeMode]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setThemeModeState(stored);
        }
      } catch {
        // Storage read failed
      }
    };

    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, isDark: resolvedDark, colors, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
