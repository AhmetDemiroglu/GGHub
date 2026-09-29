import type { Metadata } from "next";
import { Suspense } from "react";
import HomeView from "@/core/components/other/home/home-view";
import HomeStreamingFallback from "@/core/components/other/home/home-streaming-fallback";
import { getHomeContentServer } from "@/api/home/home.server";
import { resolveLocaleFromParams } from "@/i18n/server";
import { AppLocale } from "@/i18n/config";
import { seoCopy } from "@/core/seo/copy";
import { buildPageMetadata } from "@/core/seo/metadata";

type Props = { params?: Promise<{ locale?: string }> };

/**
 * Ana sayfa metadata'si. Kanonik daima dil onekli adres (/en-US, /tr): "/" bu ikisinden birine
 * rewrite/redirect eden secici sayfadir ve hreflang x-default olarak onu bildirir.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const locale = await resolveLocaleFromParams(params);

    return buildPageMetadata({
        locale,
        path: "/",
        title: seoCopy(locale, "homeTitle"),
        description: seoCopy(locale, "homeDescription"),
    });
}

/**
 * Ana sayfa artık içeriği sunucuda çekiyor. Öncesinde HomeView istemcide `useEffect` ile
 * fetch ediyordu: HTML yalnızca iskelet geliyor, LCP görseli JS indirilip hydrate olduktan
 * ve API cevabı geldikten SONRA istenmeye başlıyordu (Lighthouse'ta LCP 9.2 sn).
 *
 * API beklemesi sayfanin KENDI Suspense sinirinda (HomeContent): kabuk ve veri gerektirmeyen
 * promo slayti (HomeStreamingFallback) hemen iner, veriye bagli kisim akisla gelir. Await
 * sayfanin en ustunde oldugunda LCP metni bile API cevabini bekliyordu (gerekce fallback'te).
 *
 * `params` opsiyonel: bu bileşen hem prefix'siz ağaçta (`/`) hem de `[locale]` sarmalayıcısı
 * üzerinden çalışıyor. `[locale]` altındayken dil URL'den, değilken cookie'den okunur.
 */
export default async function HomePage({ params }: Props) {
    const locale: AppLocale = await resolveLocaleFromParams(params);

    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <Suspense fallback={<HomeStreamingFallback />}>
                <HomeContent locale={locale} />
            </Suspense>
        </div>
    );
}

async function HomeContent({ locale }: { locale: AppLocale }) {
    const initialContent = await getHomeContentServer(locale);
    return <HomeView initialContent={initialContent} />;
}
