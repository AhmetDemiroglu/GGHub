"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Messages, getMessages, translate } from "@/i18n";
import { AppLocale, getLocaleLabel, isLocale, localeStorageKey } from "@/i18n/config";

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
    const [activeLocale, setActiveLocale] = useState<AppLocale>(locale);
    const [activeMessages, setActiveMessages] = useState<Messages>(messages);

    useEffect(() => {
        const localeFromPath = pathname?.split("/").filter(Boolean)[0];
        if (localeFromPath && isLocale(localeFromPath)) {
            setActiveLocale(localeFromPath);
            setActiveMessages(getMessages(localeFromPath));
            return;
        }

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
                localStorage.setItem(localeStorageKey, nextLocale);
                setActiveLocale(nextLocale);
                setActiveMessages(getMessages(nextLocale));
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
