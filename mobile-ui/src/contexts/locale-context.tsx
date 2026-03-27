import React, { createContext, useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { setLocaleGetter } from '@/src/api/client';
import { APP_CONFIG } from '@/src/constants/config';
import {
  AppLocale,
  Messages,
  defaultLocale,
  getMessages,
  normalizeLocale,
} from '@/src/i18n';

const LOCALE_STORAGE_KEY = 'gghub-locale';

export interface LocaleContextType {
  locale: AppLocale;
  messages: Messages;
  switchLocale: (newLocale: AppLocale) => Promise<void>;
}

export const LocaleContext = createContext<LocaleContextType>({
  locale: defaultLocale,
  messages: getMessages(defaultLocale),
  switchLocale: async () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>(getMessages(defaultLocale));

  const switchLocale = useCallback(async (newLocale: AppLocale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    try {
      await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // Storage write failed
    }
  }, []);

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const stored = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
        const normalized = normalizeLocale(stored);
        if (normalized) {
          setLocale(normalized);
          setMessages(getMessages(normalized));
          return;
        }
      } catch {
        // Storage read failed
      }

      // Fall back to device locale
      try {
        const deviceLocales = getLocales();
        if (deviceLocales && deviceLocales.length > 0) {
          const deviceLocale = deviceLocales[0];
          const normalized = normalizeLocale(deviceLocale.languageTag);
          if (normalized) {
            setLocale(normalized);
            setMessages(getMessages(normalized));
            return;
          }
        }
      } catch {
        // Localization access failed
      }
    };

    loadLocale();
  }, []);

  // Register locale getter with API client
  useEffect(() => {
    setLocaleGetter(() => locale);
  }, [locale]);

  const value: LocaleContextType = {
    locale,
    messages,
    switchLocale,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
