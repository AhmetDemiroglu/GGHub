import { GameDetailView } from "@/core/components/other/game-detail/game-detail-view";
import { Metadata } from "next";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { id } = await params;
    const baseUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` || "https://localhost:7263/api";

    try {
        const response = await fetch(`${baseUrl}/games/${id}`, { next: { revalidate: 60 } });

        if (!response.ok) {
            console.error("[Metadata API Error]", {
                status: response.status,
                url: `${baseUrl}/games/${id}`
            });
            return {
                title: "Oyun Bulunamadı - GGHub",
                description: "Aradığınız oyun sistemde mevcut değil."
            };
        }

        const game = await response.json();

        const cleanDescription = (game.descriptionTr || game.description || "")
            .replace(/<[^>]*>?/gm, "")
            .substring(0, 160) + "...";

        const scoreText = game.gghubRating > 0 ? `⭐ ${game.gghubRating.toFixed(1)}` : "";

        return {
            title: `${game.name} - GGHub`,
            description: cleanDescription,
            openGraph: {
                title: `${game.name} ${scoreText} | İncelemeler ve Detaylar`,
                description: cleanDescription,
                images: [game.backgroundImage || "/placeholder-game.jpg"],
                type: 'website',
                siteName: 'GGHub',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${game.name} - GGHub`,
                description: cleanDescription,
                images: [game.backgroundImage || "/placeholder-game.jpg"],
            }
        };
    } catch (error) {
        console.error("[Metadata Fetch Error]", {
            url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/${id}`,
            error: error instanceof Error ? error.message : error
        });
        return {
            title: "GGHub - Oyun Detayı",
        };
    }
}

export default async function Page({ params }: Props) {
    const { id } = await params;

    return <GameDetailView idOrSlug={id} />;
}