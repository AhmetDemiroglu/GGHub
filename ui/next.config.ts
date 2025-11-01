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
        ],
    },
    devIndicators: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
