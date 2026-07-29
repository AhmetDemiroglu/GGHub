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
        // `host` çıplak alan adı bekliyor, şema kabul etmiyor. Öncesinde
        // "https://gghub.social" yazıyordu ve robots.txt doğrulayıcıları hata veriyordu.
        host: "gghub.social",
    };
}
