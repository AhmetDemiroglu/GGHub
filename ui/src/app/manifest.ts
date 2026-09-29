import type { MetadataRoute } from "next";
import { ANDROID_PACKAGE, APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";
import { APP_STORE_ID } from "@/core/seo/site";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "GGHub | Oyuncu Sosyal Platformu",
        short_name: "GGHub",
        description: "Oyunları keşfet, puanla, listeler oluştur ve oyuncu topluluğuna katıl.",
        id: "/",
        start_url: "/",
        scope: "/",
        lang: "tr",
        display: "standalone",
        background_color: "#050A1B",
        theme_color: "#0C0B23",
        categories: ["games", "social", "entertainment"],
        // Magaza uygulamalari: tarayici "uygulamayi yukle" akisinda yerel uygulamayi da onerebilir.
        related_applications: [
            { platform: "play", url: GOOGLE_PLAY_URL ?? "", id: ANDROID_PACKAGE },
            { platform: "itunes", url: APP_STORE_URL, id: `id${APP_STORE_ID}` },
        ],
        prefer_related_applications: false,
        icons: [
            {
                src: "/favicon.ico",
                sizes: "16x16 32x32 48x48",
                type: "image/x-icon",
            },
            {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
