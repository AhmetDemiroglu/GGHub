import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@core/components/base/theme-provider";
import { Providers } from "@core/components/base/providers";
import { Toaster } from "@/core/components/ui/sonner";
import { ThemeToggleButton } from "@core/components/base/theme-toggle-button";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import GAListener from "./ga-listener";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL("https://gghub.social"),

    title: {
        default: "GGHub",
        template: "%s • GGHub",
    },

    description: "Türkiye'nin Oyuncu Sosyal Platformu",

    applicationName: "GGHub",

    alternates: {
        canonical: "https://gghub.social",
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
    const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
    return (
        <html lang="tr" suppressHydrationWarning>
            <head>
                {/* Google Analytics */}
                {GA_ID && (
                    <>
                        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
                        <Script
                            id="ga-init"
                            strategy="afterInteractive"
                            dangerouslySetInnerHTML={{
                                __html: `
                                    window.dataLayer = window.dataLayer || [];
                                    function gtag(){dataLayer.push(arguments);}
                                    gtag('js', new Date());
                                    gtag('config', '${GA_ID}', { send_page_view: false });
                                `,
                            }}
                        />
                    </>
                )}

                {/* Microsoft Clarity */}
                {CLARITY_ID && (
                    <Script
                        id="clarity-init"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                (function(c,l,a,r,i,t,y){
                                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                                })(window, document, "clarity", "script", "${CLARITY_ID}");
                            `,
                        }}
                    />
                )}
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
                    crawl={true}
                    showSpinner={false}
                    easing="ease"
                    speed={200}
                    shadow="0 0 30px #00D9FF, 0 0 60px #00D9FF, 0 0 90px #00D9FF, 0 0 120px #00D9FF, 0 0 150px #00D9FF"
                />
                <Providers>
                    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                        <div className="fixed bottom-4 right-4 z-100">
                            <ThemeToggleButton />
                        </div>
                        {children}
                    </ThemeProvider>
                </Providers>
                <Toaster richColors />
            </body>
        </html>
    );
}
