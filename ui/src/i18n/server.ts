import { cookies, headers } from "next/headers";
import { AppLocale, defaultLocale, isLocale, localeCookieName, localeHeaderName, normalizeLocale } from "./config";

/**
 * Sunucu tarafinda aktif dil. Oncelik: middleware'in yazdigi istek basligi (URL'deki dil),
 * sonra dil cerezi, sonra varsayilan. Gerekce localeHeaderName'in yaninda (i18n/config.ts).
 */
export const resolveServerLocale = async (): Promise<AppLocale> => {
    const headerStore = await headers();
    const fromHeader = normalizeLocale(headerStore.get(localeHeaderName));
    if (fromHeader) {
        return fromHeader;
    }

    const cookieStore = await cookies();
    return normalizeLocale(cookieStore.get(localeCookieName)?.value) ?? defaultLocale;
};

/**
 * Sayfa ve generateMetadata'nin TEK dil cozumleyicisi: [locale] rotasi param verir,
 * koksuz rota (ayni dosya, `/` rewrite'i) basliktan/cerezden okur.
 */
export const resolveLocaleFromParams = async (params?: Promise<{ locale?: string }>): Promise<AppLocale> => {
    const routeLocale = (await params)?.locale;
    return routeLocale && isLocale(routeLocale) ? routeLocale : await resolveServerLocale();
};
