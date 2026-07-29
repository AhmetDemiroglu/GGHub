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
import "./globals.css";

// latin-ext olmadan Türkçe ğ/ş/İ glifleri fallback font'tan çiziliyordu.
const inter = Inter({ subsets: ["latin", "latin-ext"] });
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
    alternates: {
        canonical: "/",
        languages: {
            tr: "/tr",
            "en-US": "/en-US",
            "x-default": "/en-US",
        },
    },
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
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                {apiOrigin ? <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" /> : null}
                <link rel="preconnect" href="https://assets.gghub.social" />
                <link rel="dns-prefetch" href="https://accounts.google.com" />
                <link rel="dns-prefetch" href="https://www.clarity.ms" />
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

                {clarityId ? (
                    <Script
                        id="clarity-init"
                        strategy="lazyOnload"
                        dangerouslySetInnerHTML={{
                            __html: `
                                (function(c,l,a,r,i,t,y){
                                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                                })(window, document, "clarity", "script", "${clarityId}");
                            `,
                        }}
                    />
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
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <LocaleProvider locale={locale} messages={messages}>
                        <Providers locale={locale} messages={messages}>
                            {children}
                        </Providers>
                    </LocaleProvider>
                </ThemeProvider>
                <Toaster richColors />
            </body>
        </html>
    );
}
