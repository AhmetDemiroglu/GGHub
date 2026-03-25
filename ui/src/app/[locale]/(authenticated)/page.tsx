import type { Metadata } from "next";
import HomePage from "../../(authenticated)/page";
import { getMessages } from "@/i18n";
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const resolvedLocale: AppLocale = isLocale(locale) ? locale : "en-US";
    const seo = getSeoCopy(resolvedLocale);
    const canonicalPath = resolvedLocale === "tr" ? "/tr" : "/en-US";

    return {
        title: seo.title,
        description: seo.description,
        alternates: {
            canonical: canonicalPath,
            languages: {
                tr: "/tr",
                "en-US": "/en-US",
                "x-default": "/en-US",
            },
        },
        openGraph: {
            title: seo.openGraphTitle,
            description: seo.openGraphDescription,
            type: "website",
            url: `https://gghub.social${canonicalPath}`,
            siteName: "GGHub",
            locale: resolvedLocale === "tr" ? "tr_TR" : "en_US",
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

export default HomePage;
