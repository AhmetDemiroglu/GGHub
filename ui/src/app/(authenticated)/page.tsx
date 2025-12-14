import type { Metadata } from "next";
import HomeView from "@/core/components/other/home/home-view";

export const metadata: Metadata = {
    title: "Ana Sayfa | GGHub",
    description: "Türkiye'nin oyuncu sosyal platformu. En popüler oyunları keşfet, arkadaşlarının aktivitelerini takip et ve rozetler kazan.",
    openGraph: {
        title: "GGHub • Oyunun Kalbi Burada Atıyor",
        description: "Trend oyunlar, liderlik tabloları ve kişiselleştirilmiş oyuncu akışı GGHub'da.",
        type: "website",
        url: "https://gghub.social/",
        siteName: "GGHub",
        locale: "tr_TR",
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
        title: "GGHub • Türkiye'nin oyuncu sosyal platformu",
        description:
            "Profil oluştur, takip et, oyunları ve listeleri keşfet. Erken erişimde aktif geliştirme.",
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
