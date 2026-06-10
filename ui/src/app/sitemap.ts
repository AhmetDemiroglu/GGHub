import type { MetadataRoute } from "next";

const siteUrl = "https://gghub.social";

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = ["", "/discover", "/lists", "/about", "/privacy", "/terms"];
    const locales = ["tr", "en-US"] as const;

    return locales.flatMap((locale) =>
        routes.map((route) => ({
            url: `${siteUrl}/${locale}${route}`,
            lastModified: new Date(),
            changeFrequency: route === "" || route === "/discover" ? "daily" : "weekly",
            priority: route === "" ? 1 : route === "/discover" ? 0.9 : 0.7,
            alternates: {
                languages: {
                    tr: `${siteUrl}/tr${route}`,
                    "en-US": `${siteUrl}/en-US${route}`,
                },
            },
        }))
    );
}
