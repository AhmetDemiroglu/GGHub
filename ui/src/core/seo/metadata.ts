import type { Metadata } from "next";
import { AppLocale, buildLocalizedPathname, locales } from "@/i18n/config";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "./site";

export type SeoImage = { url: string; width?: number; height?: number; alt?: string };

export type PageMetadataInput = {
    locale: AppLocale;
    /** Dil ONEKSIZ yol: "/", "/discover", "/games/elden-ring". Kanonik ve hreflang buradan uretilir. */
    path: string;
    title: string;
    description: string;
    image?: SeoImage | string | null;
    /** Herkese acik olmayan ya da arama icin degersiz sayfalar (ayarlar, mesajlar, sifre sifirlama). */
    noIndex?: boolean;
    /** false: yol dil onekiyle YAYINLANMIYOR (/download-app gibi); hreflang uretilmez. */
    localized?: boolean;
    type?: "website" | "article" | "profile";
    publishedTime?: string;
    modifiedTime?: string;
};

export const toOgLocale = (locale: AppLocale) => (locale === "tr" ? "tr_TR" : "en_US");

/** "Elden Ring | GGHub": marka eki tek yerden, sayfa zaten iceriyorsa tekrar eklenmez. */
export const withSiteName = (title: string) => (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);

const normalizeImage = (image: PageMetadataInput["image"]): SeoImage => {
    if (!image) return { url: absoluteUrl(DEFAULT_OG_IMAGE), width: 1200, height: 630, alt: SITE_NAME };
    if (typeof image === "string") return { url: absoluteUrl(image) };
    return { ...image, url: absoluteUrl(image.url) };
};

/**
 * Sayfa metadata'sinin TEK uretim yolu. Her herkese acik sayfa bunu cagirir; kanonik URL,
 * hreflang (tr, en-US, x-default), Open Graph ve Twitter kartlari hep ayni sekilde cikar.
 *
 * x-default daima dil oneksiz yoldur: middleware o yolu ziyaretcinin diline yonlendirir,
 * Google'in "dil secici sayfa" tanimi tam olarak budur.
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
    const { locale, path, description, noIndex = false, localized = true, type = "website" } = input;
    const title = withSiteName(input.title);
    const canonicalPath = localized ? buildLocalizedPathname(path, locale) : path;
    const canonical = absoluteUrl(canonicalPath);
    const image = normalizeImage(input.image);

    const languages = localized
        ? {
              ...Object.fromEntries(locales.map((code) => [code, absoluteUrl(buildLocalizedPathname(path, code))])),
              "x-default": absoluteUrl(path),
          }
        : undefined;

    return {
        title,
        description,
        // noindex sayfada canonical/hreflang anlamsiz: dizine girmeyecek adrese "asil adres" bildirilmez.
        ...(noIndex
            ? { robots: { index: false, follow: false } }
            : { alternates: { canonical, ...(languages ? { languages } : {}) } }),
        openGraph: {
            type,
            url: canonical,
            siteName: SITE_NAME,
            locale: toOgLocale(locale),
            alternateLocale: localized ? locales.filter((code) => code !== locale).map(toOgLocale) : undefined,
            title,
            description,
            images: [image],
            ...(type === "article" ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image.url],
        },
    };
}

/** Bulunamayan / erisilemeyen icerik: dizine girmesin, kanonik de olmasin. */
export function buildNotFoundMetadata(title: string, description: string): Metadata {
    return {
        title: withSiteName(title),
        description,
        robots: { index: false, follow: false },
    };
}
