import type { Metadata } from "next";
import { Suspense } from "react";
import HomeView from "@/core/components/other/home/home-view";
import HomeStreamingFallback from "@/core/components/other/home/home-streaming-fallback";
import { getHomeContentServer } from "@/api/home/home.server";
import { getMessages } from "@/i18n";
import { resolveLocaleFromCookies } from "@/i18n/server";
import { AppLocale, isLocale } from "@/i18n/config";

const getSeoCopy = (locale: AppLocale) => {
    const seo = getMessages(locale).seo as Record<string, string>;

    return {
        title: seo.homeTitle,
        description: seo.homeDescription,
        openGraphTitle: seo.homeOgTitle,
        openGraphDescription: seo.homeOgDescription,
        twitterTitle: seo.homeTwitterTitle,
        twitterDescription: seo.homeTwitterDescription,
    };
};

export async function generateMetadata(): Promise<Metadata> {
    const locale = await resolveLocaleFromCookies();
    const seo = getSeoCopy(locale);

    return {
        title: seo.title,
        description: seo.description,
        alternates: {
            canonical: "/",
            languages: {
                tr: "/tr",
                "en-US": "/en-US",
                "x-default": "/",
            },
        },
        openGraph: {
            title: seo.openGraphTitle,
            description: seo.openGraphDescription,
            type: "website",
            url: "https://gghub.social/",
            siteName: "GGHub",
            locale: locale === "tr" ? "tr_TR" : "en_US",
            images: [
                {
                    url: "/og/gghub-social-v2.png",
                    width: 1200,
                    height: 630,
                    alt: "GGHub oyuncu sosyal platformu",
                    type: "image/png",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: seo.twitterTitle,
            description: seo.twitterDescription,
            images: ["/og/gghub-social-v2.png"],
        },
    };
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
export default async function HomePage({ params }: { params?: Promise<{ locale?: string }> }) {
    const routeLocale = (await params)?.locale;
    const locale: AppLocale = routeLocale && isLocale(routeLocale) ? routeLocale : await resolveLocaleFromCookies();

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
