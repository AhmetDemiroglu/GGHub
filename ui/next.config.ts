import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Match Vercel's build behavior: skip ESLint during `next build` (Vercel already disables it).
    // Type-checking still runs, so local `next build` now catches type errors instead of failing
    // on pre-existing lint errors first (which previously masked real type errors from Vercel).
    eslint: {
        ignoreDuringBuilds: true,
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
        ],
    },
    devIndicators: false,
};

export default nextConfig;
