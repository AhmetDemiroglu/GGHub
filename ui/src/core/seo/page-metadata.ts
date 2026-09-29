import type { Metadata } from "next";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "./copy";
import { buildPageMetadata } from "./metadata";

type RouteProps = { params?: Promise<{ locale?: string }> };

/**
 * Icerigi sabit sayfalarin generateMetadata'si tek satirda:
 *   export const generateMetadata = staticPageMetadata("/about", "about");
 * Baslik/aciklama i18n `seo.{key}Title` ve `seo.{key}Description` anahtarlarindan gelir.
 * noIndex sayfalar (ayarlar, mesajlar, sifre) arama icin degersizdir; aciklama site geneli metindir.
 *
 * Sunucuya ozel (next/headers): istemci bilesenlerinden import edilmez.
 */
export const staticPageMetadata = (path: string, key: string, options: { noIndex?: boolean } = {}) =>
    async ({ params }: RouteProps): Promise<Metadata> => {
        const locale = await resolveLocaleFromParams(params);

        return buildPageMetadata({
            locale,
            path,
            title: seoCopy(locale, `${key}Title`),
            description: seoCopy(locale, options.noIndex ? "siteDescription" : `${key}Description`),
            noIndex: options.noIndex,
        });
    };
