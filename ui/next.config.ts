import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Match Vercel's build behavior: skip ESLint during `next build` (Vercel already disables it).
    // Type-checking still runs, so local `next build` now catches type errors instead of failing
    // on pre-existing lint errors first (which previously masked real type errors from Vercel).
    eslint: {
        ignoreDuringBuilds: true,
    },
    /**
     * Oyun detayi Vercel CDN'inde onbellekli. Kok layout headers() okudugu icin sayfa her istekte
     * sunucuda ciziliyor (ISR yok); ~92 bin oyun URL'sini gezen botlar Hobby'nin aylik 4 CPU saatini
     * iki gunde bitirdi (30 Eyl 2026). Vercel-CDN-Cache-Control, Next'in "private, no-store"
     * Cache-Control'unden once gelir ve tarayiciya gitmez. 3 gun taze, sonra 7 gun eskisi sunulurken
     * arkada yenilenir: bir URL en fazla 3 gunde bir cizilir, tum botlar ayni kopyayi alir.
     * Kosul: yanitta Set-Cookie olmamali (middleware bu yolda dil cerezi yazmaz, cdnCachedPathPattern).
     * Istemci initialData'yi bayat sayip veriyi tazeler (game-detail-view, review-list).
     */
    async headers() {
        return [
            {
                source: "/:locale(tr|en-US)/games/:id",
                headers: [{ key: "Vercel-CDN-Cache-Control", value: "s-maxage=259200, stale-while-revalidate=604800" }],
            },
        ];
    },
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"],
        });
        return config;
    },
    images: {
        // AVIF/WebP: avatar ve oyun görselleri JPEG olarak saklanıyor, optimizer bunları
        // istemcinin desteklediği en küçük formata çevirsin.
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "localhost",
                port: "7263",
                pathname: "/images/**",
            },
            {
                protocol: "https",
                hostname: "media.rawg.io",
                pathname: "/media/**",
            },
            {
                protocol: "https",
                hostname: "i.pravatar.cc",
            },
            {
                // AI bot avatarlari (illustrasyon, gercek fotograf DEGIL). AiAgentPersonas.AvatarUrl.
                protocol: "https",
                hostname: "api.dicebear.com",
                pathname: "/9.x/**",
            },
            {
                // R2 (profil fotoğrafı + kapak görseli). Buraya eklenmediği sürece bu görseller
                // next/image'dan geçemiyordu; ham <img> ile tam çözünürlükte iniyorlardı.
                protocol: "https",
                hostname: "assets.gghub.social",
            },
            {
                // Google ile giriş yapan kullanıcıların ProfileImageUrl'i doğrudan Google CDN'ini
                // gösteriyor (AuthService, OAuth "picture" alanı).
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                // IGDB kapak/görselleri. Buraya eklenmediği sürece next/image bu görselleri
                // REDDEDİYOR ve hero slaytı bomboş görünüyordu (detay sayfası ham <img>
                // kullandığı için orada sorun yoktu, hata bu yüzden geç fark edildi).
                protocol: "https",
                hostname: "images.igdb.com",
                pathname: "/igdb/image/**",
            },
            {
                // Steam mağaza görselleri (header_image). Steam birden fazla CDN ana makinesi
                // kullanıyor; hepsi aynı yol şemasını paylaşıyor.
                protocol: "https",
                hostname: "shared.akamai.steamstatic.com",
            },
            {
                protocol: "https",
                hostname: "shared.cloudflare.steamstatic.com",
            },
            {
                protocol: "https",
                hostname: "cdn.akamai.steamstatic.com",
            },
            {
                protocol: "https",
                hostname: "cdn.cloudflare.steamstatic.com",
            },
        ],
    },
    devIndicators: false,
};

export default nextConfig;
