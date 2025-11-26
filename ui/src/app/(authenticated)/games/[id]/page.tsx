"use client";

import { gameApi } from "@/api/gaming/game.api";
import { GameAbout } from "@/core/components/other/game-detail/game-about";
import { GameHero } from "@/core/components/other/game-detail/game-hero";
import { GameSidebar } from "@/core/components/other/game-detail/game-sidebar";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import React from "react";
import { Construction } from "lucide-react";

export default function GameDetailPage() {
    const params = useParams();
    const idOrSlug = params?.id as string;

    const { data: game, isLoading, isError } = useQuery({
        queryKey: ["game", idOrSlug],
        queryFn: () => gameApi.getById(idOrSlug),
        enabled: !!idOrSlug,
    });

    if (isLoading) return null;

    if (isError || !game) {
        return (
            <div className="w-full h-full p-10 flex flex-col items-center justify-center space-y-4">
                <h2 className="text-3xl font-bold text-white">Oyun Bulunamadı</h2>
                <p className="text-zinc-500">Aradığınız oyun sistemde mevcut değil veya kaldırılmış.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-full bg-background text-white pb-20">
            {/* Main Container */}
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6 space-y-8">

                {/* 1. HERO ALANI (Görsel, Başlık, Aksiyonlar) */}
                <GameHero game={game} />

                {/* 2. İÇERİK GRID (Sol: İçerik / Sağ: Bilgi Paneli) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">

                    {/* SOL KOLON (Geniş Alan) */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Hakkında */}
                        <GameAbout game={game} />

                        {/* İncelemeler Bölümü */}
                        <div id="reviews" className="pt-8 border-t border-zinc-800">
                            {/* Buraya Review Listesi ve Formu Gelecek */}
                            <h3 className="text-2xl font-bold mb-6">Kullanıcı İncelemeleri</h3>
                            <div className="flex items-center text-amber-500 dark:text-amber-400 border p-8 border-zinc-800 rounded-xl text-center">
                                <Construction className="h-5 w-5" />
                                <span className="text-md font-medium ml-1">İnceleme sistemi çalışmaları devam ediyor...</span>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ KOLON */}
                    <div className="space-y-8">
                        {/* Bilgi Kartı */}
                        <GameSidebar game={game} />

                        {/* Benzer Oyunlar vb. buraya gelebilir */}
                    </div>

                </div>
            </div>
        </div>
    );
}