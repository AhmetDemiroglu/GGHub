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
import { resolveLocaleFromCookies } from "@/i18n/server";
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
const siteUrl = "https://gghub.social";
const socialImage = "/og/gghub-social-v2.png";

// İlk boyamadan hemen sonra bu origin'lere istek gidiyor; TLS el sıkışmasını öne çekmek
// Lighthouse ölçümünde ~440 ms kazandırıyor.
const apiOrigin = (() => {
    try {
        return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").origin;
    } catch {
        return null;
    }
})();

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "GGHub | Oyuncu Sosyal Platformu",
        template: "%s",
    },
    description: "Oyunları keşfet, puanla, listeler oluştur ve oyuncu topluluğuna katıl.",
    applicationName: "GGHub",
    authors: [{ name: "GGHub", url: siteUrl }],
    creator: "GGHub",
    publisher: "GGHub",
    keywords: [
        "GGHub",
        "oyuncu sosyal platformu",
        "oyun keşfet",
        "oyun incelemeleri",
        "oyun listeleri",
        "oyuncu profili",
        "gaming social platform",
        "game reviews",
        "game lists",
    ],
    // alternates BILEREK yok: kok layout'ta canonical "/" tanimlamak, kendi canonical'ini
    // yazmayan HER sayfaya (Kesfet, oyun detayi...) "canonical = ana sayfa" dedirtiyordu
    // (Lighthouse SEO: "Points to the domain's root URL"). Ana sayfa kendi alternates'ini kurar.
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
    openGraph: {
        type: "website",
        url: siteUrl,
        siteName: "GGHub",
        locale: "en_US",
        alternateLocale: ["tr_TR"],
        title: "GGHub | Where Gaming Lives",
        description: "Discover games, rate what you play, create lists, and connect with the gaming community.",
        images: [
            {
                url: socialImage,
                width: 1200,
                height: 630,
                alt: "GGHub oyuncu sosyal platformu",
                type: "image/png",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "GGHub | The Social Platform for Gamers",
        description: "Discover games, rate what you play, create lists, and connect with the gaming community.",
        images: [socialImage],
    },
    category: "gaming",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = await resolveLocaleFromCookies();
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
