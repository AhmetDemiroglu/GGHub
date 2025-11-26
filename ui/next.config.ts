import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
                pathname: "/media/**", // RAWG'nin image path'i
            },
        ],
    },
    devIndicators: false,
};

export default nextConfig;
