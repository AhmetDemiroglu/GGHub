import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@core/components/base/theme-provider";
import { Providers } from "@core/components/base/providers";
import { LocaleProvider } from "@/core/contexts/locale-context";
import { Toaster } from "@/core/components/ui/sonner";
import { getMessages } from "@/i18n";
import { resolveServerLocale } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { toOgLocale } from "@/core/seo/metadata";
import { APP_STORE_ID, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/core/seo/site";
import { ANDROID_PACKAGE } from "@/core/lib/store-links";
import { JsonLd, mobileApplicationJsonLd, organizationJsonLd, webSiteJsonLd } from "@/core/seo/json-ld";
import GAListener from "./ga-listener";
import SiteAnalyticsListener from "./site-analytics-listener";
import "./globals.css";

// latin-ext olmadan Türkçe ğ/ş/İ glifleri fallback font'tan çiziliyordu.
// display "optional": font ilk boyaya yetismezse o sayfa yuklemesi metrik uyumlu yedek fontla
// kalir, degisim (swap) olmaz. Onceki "swap" ile Lighthouse LCP'yi font degisim anina tasiyordu:
// Inter Black yedekten genis, hero basligi bir satir buyuyor ve Chrome yeni LCP girdisi
// yaziyordu; o yeniden boyama da hydration yuzunden 3 sn gecikiyordu (LCP 4.4 sn, FCP 1.4 sn).
// Font onbellege girdikten sonra (ikinci sayfadan itibaren) Inter ilk boyada gelir.
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "optional" });

// İlk boyamadan hemen sonra bu origin'lere istek gidiyor; TLS el sıkışmasını öne çekmek
// Lighthouse ölçümünde ~440 ms kazandırıyor.
const apiOrigin = (() => {
    try {
        return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").origin;
    } catch {
        return null;
    }
})();

/**
 * Kok metadata dile gore uretilir (baslik, aciklama, OG dili). alternates BILEREK yok: kok
 * layout'ta canonical "/" tanimlamak, kendi canonical'ini yazmayan HER sayfaya "canonical =
 * ana sayfa" dedirtiyordu (Lighthouse SEO: "Points to the domain's root URL"). Her herkese
 * acik sayfa kendi canonical + hreflang'ini core/seo/metadata.ts uzerinden kurar.
 */
export async function generateMetadata(): Promise<Metadata> {
    const locale = await resolveServerLocale();
    const title = seoCopy(locale, "siteTitle");
    const description = seoCopy(locale, "siteDescription");

    return {
        metadataBase: new URL(SITE_URL),
        title: {
            default: title,
            template: "%s",
        },
        description,
        applicationName: SITE_NAME,
        authors: [{ name: SITE_NAME, url: SITE_URL }],
        creator: SITE_NAME,
        publisher: SITE_NAME,
        keywords: [
            "GGHub",
            "oyuncu sosyal platformu",
            "oyun keşfet",
            "oyun incelemeleri",
            "oyun listeleri",
            "oyun çıkış takvimi",
            "oyuncu profili",
            "gaming social platform",
            "game reviews",
            "game lists",
            "game release calendar",
        ],
        // Google Search Console "HTML etiketi" dogrulamasi. Vercel'de NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
        // tanimlanmadiysa etiket hic basilmaz (DNS/GA ile dogrulandiysa gerekmez).
        verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-image-preview": "large",
                "max-snippet": -1,
                "max-video-preview": -1,
            },
        },
        icons: {
            icon: "/favicon.ico",
            shortcut: "/favicon.ico",
        },
        // iOS Safari "Smart App Banner": magaza sayfasina gitmeden uygulamayi acar/indirir.
        itunes: { appId: APP_STORE_ID },
        // Facebook/Meta App Links: paylasilan baglanti uygulama yukluyse uygulamada acilir.
        appLinks: {
            ios: { url: "gghub://", app_store_id: APP_STORE_ID, app_name: SITE_NAME },
            android: { package: ANDROID_PACKAGE, url: "gghub://", app_name: SITE_NAME },
        },
        formatDetection: { telephone: false },
        openGraph: {
            type: "website",
            url: SITE_URL,
            siteName: SITE_NAME,
            locale: toOgLocale(locale),
            alternateLocale: [locale === "tr" ? "en_US" : "tr_TR"],
            title,
            description,
            images: [
                {
                    url: DEFAULT_OG_IMAGE,
                    width: 1200,
                    height: 630,
                    alt: title,
                    type: "image/png",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [DEFAULT_OG_IMAGE],
        },
        category: "gaming",
    };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await resolveServerLocale();
    const messages = getMessages(locale);
    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    // Microsoft Clarity KALDIRILDI (29 Eyl 2026, Ahmet): site ici davranis olcumu artik kendi
    // SiteEvents altyapimizda (/behavior, /traffic). Lighthouse'ta 311 ms CPU + 27 KB + 76 ms
    // ana is parcacigi blokaji vardi, karsiliginda kullandigimiz tek bir veri yoktu.

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                {apiOrigin ? <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" /> : null}
                <link rel="preconnect" href="https://assets.gghub.social" />
                <link rel="dns-prefetch" href="https://accounts.google.com" />
                <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

                {gaId ? (
                    <>
                        {/* lazyOnload: analitik LCP ile öncelik yarışmasın, boşta kalınca yüklensin. */}
                        <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
                        <Script
                            id="ga-init"
                            strategy="lazyOnload"
                            dangerouslySetInnerHTML={{
                                __html: `
                                    window.dataLayer = window.dataLayer || [];
                                    function gtag(){dataLayer.push(arguments);}
                                    gtag('js', new Date());
                                    gtag('config', '${gaId}', { send_page_view: false });
                                `,
                            }}
                        />
                    </>
                ) : null}

            </head>
            <body className={inter.className}>
                {/* Site geneli yapisal veri: kurulus, site (arama eylemi) ve mobil uygulama.
                    Sayfaya ozel semalar (oyun, inceleme, profil...) sayfanin kendisinde. */}
                <JsonLd data={[organizationJsonLd(), webSiteJsonLd(locale), mobileApplicationJsonLd()]} />
                <Suspense fallback={null}>
                    <GAListener />
                </Suspense>
                <NextTopLoader
                    color="#B026FF"
                    initialPosition={0.08}
                    crawlSpeed={200}
                    height={4}
                    crawl
                    showSpinner={false}
                    easing="ease"
                    speed={200}
                    shadow="0 0 30px #00D9FF, 0 0 60px #00D9FF, 0 0 90px #00D9FF, 0 0 120px #00D9FF, 0 0 150px #00D9FF"
                />
                {/* defaultTheme "system": ilk acilista isletim sisteminin acik/koyu tercihi uygulanir.
                    Kullanici dugmeden tema secince next-themes secimi localStorage("theme")'a yazar ve
                    sonraki acilislarda sistem yerine o secim gecerli olur. */}
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <LocaleProvider locale={locale} messages={messages}>
                        <Providers locale={locale} messages={messages}>
                            {/* AuthProvider'in icinde olmali: kayitli kullanicinin gezintisi kimligiyle baglanir. */}
                            <SiteAnalyticsListener />
                            {children}
                        </Providers>
                    </LocaleProvider>
                    {/* ThemeProvider'in ICINDE olmali: disarida useTheme() bos context dondurur ve richColors
                        toast'lari uygulama temasi yerine isletim sistemi temasini takip ederdi. */}
                    <Toaster richColors />
                </ThemeProvider>
            </body>
        </html>
    );
}
