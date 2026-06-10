import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "GGHub | Oyuncu Sosyal Platformu",
        short_name: "GGHub",
        description: "Oyunları keşfet, puanla, listeler oluştur ve oyuncu topluluğuna katıl.",
        start_url: "/",
        display: "standalone",
        background_color: "#050A1B",
        theme_color: "#0C0B23",
        categories: ["games", "social", "entertainment"],
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}
