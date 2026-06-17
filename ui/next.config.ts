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
        ],
    },
    devIndicators: false,
};

export default nextConfig;
