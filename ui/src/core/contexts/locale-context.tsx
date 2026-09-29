"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Messages, loadMessages, translate } from "@/i18n/translate";
import { AppLocale, getLocaleLabel, isLocale, localeStorageKey } from "@/i18n/config";
import { setActiveClientLocale } from "@/core/lib/client-locale";

type LocaleContextValue = {
    locale: AppLocale;
    messages: Messages;
    localeLabel: string;
    t: (key: string, values?: Record<string, string | number>) => string;
    persistLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, locale, messages }: { children: React.ReactNode; locale: AppLocale; messages: Messages }) {
    const pathname = usePathname();
    const [activeLocale, setActiveLocale] = useState<AppLocale>(() => {
        // Cocuklarin ilk sorgulari efektlerden ONCE cikar: Accept-Language'i ilk render'da ayarla ki
        // "/" altinda eski bir localStorage tercihi yuzunden baska dilin bot verisi istenmesin.
        const fromPath = pathname?.split("/").filter(Boolean)[0];
        setActiveClientLocale(fromPath && isLocale(fromPath) ? fromPath : locale);
        return locale;
    });
    const [activeMessages, setActiveMessages] = useState<Messages>(messages);

    useEffect(() => {
        const localeFromPath = pathname?.split("/").filter(Boolean)[0];
        if (localeFromPath && isLocale(localeFromPath)) {
            setActiveClientLocale(localeFromPath);
            setActiveLocale(localeFromPath);
            // Sunucunun gonderdigi paket zaten bu dilse onu kullan; degilse diger dilin paketi
            // ayri chunk olarak iner (her sayfada iki dili birden tasimamak icin, bkz. i18n/translate.ts).
            if (localeFromPath === locale) {
                setActiveMessages(messages);
                return;
            }
            let cancelled = false;
            void loadMessages(localeFromPath).then((loaded) => {
                if (!cancelled) setActiveMessages(loaded);
            });
            return () => {
                cancelled = true;
            };
        }

        setActiveClientLocale(locale);
        setActiveLocale(locale);
        setActiveMessages(messages);
    }, [pathname, locale, messages]);

    const value = useMemo<LocaleContextValue>(() => {
        return {
            locale: activeLocale,
            messages: activeMessages,
            localeLabel: getLocaleLabel(activeLocale),
            t: (key, values) => translate(activeMessages, key, values),
            persistLocale: (nextLocale) => {
                document.cookie = `gghub-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
                document.cookie = `gghub-locale-manual=1; path=/; max-age=31536000; samesite=lax`;
                localStorage.setItem(localeStorageKey, nextLocale);
                setActiveClientLocale(nextLocale);
                setActiveLocale(nextLocale);
                void loadMessages(nextLocale).then(setActiveMessages);
            },
        };
    }, [activeLocale, activeMessages]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocaleContext = () => {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error("useLocaleContext must be used within LocaleProvider.");
    }

    return context;
};

export const useI18n = () => useLocaleContext().t;
export const useCurrentLocale = () => useLocaleContext().locale;
