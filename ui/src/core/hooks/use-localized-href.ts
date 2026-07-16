"use client";

import { useCallback } from "react";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { buildLocalizedPathname, type AppLocale } from "@/i18n/config";

/**
 * Uygulama ici bir href'e aktif locale onekini ekler.
 * Sadece "/" ile baslayan yollar cevrilir; mutlak URL'ler (http..., mailto:) oldugu gibi kalir.
 * Bu, sidebar / command-search / search-bar icinde ayri ayri tekrarlanan kopyalarin TEK kaynagi.
 */
export const localizeHref = (href: string, locale: AppLocale): string => {
    return href.startsWith("/") ? buildLocalizedPathname(href, locale) : href;
};

/** localizeHref'in aktif locale'e bagli hook hali. */
export function useLocalizedHref() {
    const locale = useCurrentLocale();
    return useCallback((href: string) => localizeHref(href, locale), [locale]);
}
