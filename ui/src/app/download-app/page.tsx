import type { Metadata } from "next";
import DownloadAppClient from "./download-app-client";

const siteUrl = "https://gghub.social";

const META = {
    tr: {
        title: "GGHub'ı indir | iOS'ta yayında",
        description: "GGHub App Store'da yayında. Oyunları keşfet, puanla, listeler oluştur ve oyuncu topluluğuna katıl. Android sürümü çok yakında.",
        ogAlt: "GGHub mobil uygulaması yayında",
    },
    en: {
        title: "Download GGHub | Live on the App Store",
        description: "GGHub is live on the App Store. Discover games, rate what you play, build lists and join the gaming community. Android coming soon.",
        ogAlt: "GGHub mobile app is live",
    },
} as const;

type Lang = "tr" | "en";

const resolveLang = (value?: string | string[]): Lang => {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.toLowerCase().startsWith("tr") ? "tr" : "en";
};

type SearchParams = Promise<{ lang?: string | string[] }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
    const { lang } = await searchParams;
    // When shared without ?lang, crawlers (WhatsApp/Facebook/etc.) have no browser
    // locale to read, so default the card to Turkish — the primary audience and the
    // language of our other social cards. ?lang=en still yields the English card.
    const l = lang ? resolveLang(lang) : "tr";
    const m = META[l];
    // Static, pre-rendered card (~56 KB). The previous dynamic next/og route could
    // take 5s+ on a cold start and WhatsApp's crawler timed out before the image
    // loaded, so the shared link showed no thumbnail. A static file is served
    // instantly and reliably by every crawler.
    const ogImage = `${siteUrl}/og/download-app-${l}.jpg`;

    return {
        title: m.title,
        description: m.description,
        alternates: { canonical: "/download-app" },
        openGraph: {
            type: "website",
            url: `${siteUrl}/download-app`,
            siteName: "GGHub",
            locale: l === "tr" ? "tr_TR" : "en_US",
            title: m.title,
            description: m.description,
            images: [{ url: ogImage, width: 1200, height: 630, alt: m.ogAlt, type: "image/jpeg" }],
        },
        twitter: {
            card: "summary_large_image",
            title: m.title,
            description: m.description,
            images: [ogImage],
        },
    };
}

export default async function DownloadAppPage({ searchParams }: { searchParams: SearchParams }) {
    const { lang } = await searchParams;
    // Only force the page language when ?lang is present; otherwise the client uses the browser locale.
    const langParam = lang ? resolveLang(lang) : undefined;
    return <DownloadAppClient langParam={langParam} />;
}
