import { AppLocale, buildLocalizedPathname, defaultLocale, isLocale } from "./config";

/**
 * Istemciye giden i18n yardimcilari. Bu dosya mesaj paketlerini STATIK olarak ICE ALMAZ.
 *
 * Neden ayri: index.ts hem tr hem en-US paketini import ediyor (toplam ~160 KB kaynak).
 * LocaleProvider (client) oradan getMessages'i cektigi icin iki dilin tamami her sayfanin
 * kok layout JS'ine giriyordu; sunucu zaten aktif dilin mesajlarini prop olarak gonderiyor.
 * Lighthouse "Duplicated JavaScript" bulgusunun kaynagi buydu. Sunucu tarafi getMessages'i
 * index.ts'ten almaya devam eder; istemci yalniz bu dosyayi ve gerekirse loadMessages'i kullanir.
 */
export type MessageNode = {
    [key: string]: string | MessageNode;
};

export type Messages = MessageNode;

/** Dil degisiminde diger dilin paketini ayri bir chunk olarak indirir (ilk yukte yok). */
export const loadMessages = async (locale: AppLocale): Promise<Messages> =>
    locale === "tr" ? (await import("./messages/tr")).trMessages : (await import("./messages/en-US")).enUSMessages;

const getValueByPath = (messages: Record<string, unknown>, path: string): unknown => {
    return path.split(".").reduce<unknown>((accumulator, segment) => {
        if (accumulator && typeof accumulator === "object" && segment in accumulator) {
            return (accumulator as Record<string, unknown>)[segment];
        }

        return undefined;
    }, messages);
};

export const translate = (messages: Messages, key: string, values?: Record<string, string | number>) => {
    const template = getValueByPath(messages as unknown as Record<string, unknown>, key);
    if (typeof template !== "string") {
        return key;
    }

    if (!values) {
        return template;
    }

    return Object.entries(values).reduce((result, [token, value]) => {
        return result.replaceAll(`{${token}}`, String(value));
    }, template);
};

export const getPathLocale = (pathname?: string | null): AppLocale => {
    const firstSegment = pathname?.split("/").filter(Boolean)[0];
    return firstSegment && isLocale(firstSegment) ? firstSegment : defaultLocale;
};

export const getLocalizedHref = (pathname: string, locale: AppLocale) => buildLocalizedPathname(pathname, locale);
