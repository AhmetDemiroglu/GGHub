import { locales, buildLocalizedPathname, type AppLocale } from "@/i18n/config";
import { absoluteUrl } from "./site";

/**
 * Sitemap XML uretimi (elle). Next'in generateSitemaps'i derleme aninda degerlendiriliyor:
 * API o an ulasilamazsa ya da oyun sayisi buyuyup yeni parca gerekirse bir sonraki deploy'a
 * kadar eksik kaliyordu. Route handler'lar istek aninda calisir, saatlik yeniden dogrulanir.
 */
export type SitemapUrl = {
    loc: string;
    lastModified?: string;
    changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority?: number;
    /** hreflang alternatifleri; dil onekli sayfalarda her dil + x-default. */
    alternates?: { hreflang: string; href: string }[];
};

const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Dil onekli bir yol icin tr, en-US ve x-default alternatifleri (buildPageMetadata ile ayni kural). */
export const localizedAlternates = (path: string) => [
    ...locales.map((locale) => ({ hreflang: locale, href: absoluteUrl(buildLocalizedPathname(path, locale)) })),
    { hreflang: "x-default", href: absoluteUrl(path) },
];

/** Ayni sayfanin her dil icin bir <url> girdisi; hepsi birbirini hreflang ile gosterir. */
export const localizedUrls = (path: string, extra: Omit<SitemapUrl, "loc" | "alternates"> = {}): SitemapUrl[] =>
    locales.map((locale: AppLocale) => ({
        loc: absoluteUrl(buildLocalizedPathname(path, locale)),
        alternates: localizedAlternates(path),
        ...extra,
    }));

const toIsoDate = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    // Gecersiz ya da "0001-01-01" gibi bos tarihler lastmod olarak yazilmaz.
    return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 ? undefined : date.toISOString();
};

export const urlsetXml = (urls: SitemapUrl[]) => {
    const body = urls
        .map((url) => {
            const lastmod = toIsoDate(url.lastModified);
            const alternates = (url.alternates ?? [])
                .map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${escapeXml(alternate.href)}"/>`)
                .join("");
            return (
                `<url><loc>${escapeXml(url.loc)}</loc>` +
                (lastmod ? `<lastmod>${lastmod}</lastmod>` : "") +
                (url.changeFrequency ? `<changefreq>${url.changeFrequency}</changefreq>` : "") +
                (url.priority !== undefined ? `<priority>${url.priority.toFixed(1)}</priority>` : "") +
                alternates +
                "</url>"
            );
        })
        .join("");

    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`;
};

export const sitemapIndexXml = (sitemaps: { loc: string; lastModified?: string }[]) => {
    const body = sitemaps
        .map((sitemap) => {
            const lastmod = toIsoDate(sitemap.lastModified);
            return `<sitemap><loc>${escapeXml(sitemap.loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</sitemap>`;
        })
        .join("");

    return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
};

export const xmlResponse = (xml: string) =>
    new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // CDN bir saat tutar; arkada API'ye pratikte saatte bir istek gider.
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
