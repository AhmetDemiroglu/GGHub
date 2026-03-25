export const locales = ["tr", "en-US"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en-US";
export const localeCookieName = "gghub-locale";
export const localeStorageKey = "gghub-locale";

export const countryToLocale = (countryCode?: string | null): AppLocale => {
    return countryCode?.toUpperCase() === "TR" ? "tr" : "en-US";
};

export const isLocale = (value: string): value is AppLocale => locales.includes(value as AppLocale);

export const normalizeLocale = (value?: string | null): AppLocale | null => {
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    if (isLocale(normalized)) {
        return normalized;
    }

    const lower = normalized.toLowerCase();
    if (lower === "tr" || lower === "tr-tr") {
        return "tr";
    }

    if (lower === "en" || lower === "en-us") {
        return "en-US";
    }

    return null;
};

export const stripLocaleFromPathname = (pathname: string) => {
    const segments = pathname.split("/");
    const maybeLocale = segments[1];

    if (maybeLocale && isLocale(maybeLocale)) {
        const stripped = `/${segments.slice(2).join("/")}`;
        return stripped === "/" ? "/" : stripped.replace(/\/+$/, "") || "/";
    }

    return pathname || "/";
};

export const buildLocalizedPathname = (pathname: string, locale: AppLocale) => {
    const strippedPathname = stripLocaleFromPathname(pathname);
    return strippedPathname === "/" ? `/${locale}` : `/${locale}${strippedPathname}`;
};

export const getLocaleLabel = (locale: AppLocale) => {
    return locale === "tr" ? "T\u00FCrk\u00E7e" : "English (US)";
};

export const getLocaleFlag = (locale: AppLocale) => {
    return locale === "tr" ? "\u{1F1F9}\u{1F1F7}" : "\u{1F1FA}\u{1F1F8}";
};

export const getDateLocaleCode = (locale: AppLocale) => {
    return locale === "tr" ? "tr" : "en-US";
};
