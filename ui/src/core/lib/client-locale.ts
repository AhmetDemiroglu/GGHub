import { defaultLocale, isLocale, localeCookieName, localeStorageKey } from "@/i18n/config";

/**
 * Tarayicidaki gecerli arayuz dili. Sira: URL yolu (ekranda gorunen dil), kaydedilmis tercih,
 * cerez, varsayilan. API istekleri Accept-Language'i buradan alir; boylece /en altinda acik bir
 * sayfa localStorage'da eski bir "tr" tercihi kalmis diye Turkce veri (orn. Turkce botlar) istemez.
 */
export function getClientLocale(): string {
    if (typeof window === "undefined") return defaultLocale;

    const fromPath = window.location.pathname.split("/").filter(Boolean)[0];
    if (fromPath && isLocale(fromPath)) return fromPath;

    try {
        const stored = localStorage.getItem(localeStorageKey);
        if (stored) return stored;
    } catch {
        // Gizli pencere / engellenmis depolama: cereze dus.
    }

    const cookie = document.cookie
        .split("; ")
        .find((item) => item.startsWith(`${localeCookieName}=`))
        ?.split("=")[1];
    return cookie || defaultLocale;
}
