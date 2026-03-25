import type { Metadata } from "next";
import HomeView from "@/core/components/other/home/home-view";
import { getMessages } from "@/i18n";
import { resolveLocaleFromCookies } from "@/i18n/server";
import { AppLocale } from "@/i18n/config";

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
                    url: "/og/home.png",
                    width: 1200,
                    height: 630,
                    alt: "GGHub",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: seo.twitterTitle,
            description: seo.twitterDescription,
            images: ["/og/home.png"],
        },
    };
}

export default function HomePage() {
    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <HomeView />
        </div>
    );
}
