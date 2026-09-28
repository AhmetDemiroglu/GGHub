"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentLocale } from "@/core/contexts/locale-context";

/**
 * Dil degisince sunucudan gelen her sey yeniden cekilir: Accept-Language'e bagli veri (bot
 * kulubu, oneriler, bildirim metinleri, ceviriler) eski dilde onbellekte kalmasin. Yalniz aktif
 * sorgular yeniden istenir; digerleri bir sonraki acilista taze cekilir. Kendi state'iyle
 * yuklenen akis (home-social-feed) ayni sinyali kendi icinde dinler.
 */
export function LocaleQuerySync() {
    const locale = useCurrentLocale();
    const queryClient = useQueryClient();
    const previous = useRef(locale);

    useEffect(() => {
        if (previous.current === locale) return;
        previous.current = locale;
        void queryClient.invalidateQueries();
    }, [locale, queryClient]);

    return null;
}
