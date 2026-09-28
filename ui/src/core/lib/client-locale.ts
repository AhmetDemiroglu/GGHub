import { defaultLocale, isLocale, localeCookieName, localeStorageKey } from "@/i18n/config";

let activeLocale: string | null = null;

/**
 * LocaleProvider ekrandaki dili buraya yazar: dil degistirme aninda, URL yolu degismeden ONCE.
 * Boylece dil degisir degismez atilan istekler (akis, kulup) yeni dille gider.
 */
export function setActiveClientLocale(locale: string) {
    activeLocale = locale;
}

/**
 * Tarayicidaki gecerli arayuz dili. Sira: ekrandaki dil (LocaleProvider), URL yolu (ekranda gorunen dil), kaydedilmis tercih,
 * cerez, varsayilan. API istekleri Accept-Language'i buradan alir; boylece /en altinda acik bir
 * sayfa localStorage'da eski bir "tr" tercihi kalmis diye Turkce veri (orn. Turkce botlar) istemez.
 */
export function getClientLocale(): string {
    if (typeof window === "undefined") return defaultLocale;
    if (activeLocale) return activeLocale;

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
