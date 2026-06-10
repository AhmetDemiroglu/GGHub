import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/admin/",
                "/messages/",
                "/profile/",
                "/my-lists/",
                "/my-reports/",
                "/tr/admin/",
                "/tr/messages/",
                "/tr/profile/",
                "/tr/my-lists/",
                "/tr/my-reports/",
                "/en-US/admin/",
                "/en-US/messages/",
                "/en-US/profile/",
                "/en-US/my-lists/",
                "/en-US/my-reports/",
            ],
        },
        sitemap: "https://gghub.social/sitemap.xml",
        host: "https://gghub.social",
    };
}
