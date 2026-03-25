import type { Metadata } from "next";
import HomeView from "@/core/components/other/home/home-view";

export const metadata: Metadata = {
    title: "GGHub",
    description: "GGHub",
    openGraph: {
        title: "GGHub",
        description: "GGHub",
        type: "website",
        url: "https://gghub.social/",
        siteName: "GGHub",
        locale: "en_US",
        images: [
            {
                url: "/og/home.png",
                width: 1200,
                height: 630,
                alt: "GGHub",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "GGHub",
        description: "GGHub",
        images: ["/og/home.png"],
    },
};

export default function HomePage() {
    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <HomeView />
        </div>
    );
}
