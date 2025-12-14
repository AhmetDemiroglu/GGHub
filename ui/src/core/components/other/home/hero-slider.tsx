"use client";

import Image from "next/image";
import Link from "next/link";
import { HomeGame } from "@/models/home/home.model";
import { Button } from "@/core/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/core/components/ui/carousel";
import { Play } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import { getImageUrl } from "@/core/lib/get-image-url";
import logoSrc from "@core/assets/logo.png";
import rawgLogoSrc from "@core/assets/rawg_logo.png";
import metacriticLogoSrc from "@core/assets/metacritic_logo.png";
import { PlatformIcons } from "@/core/components/other/platform-icons";

interface HeroSliderProps {
    games: HomeGame[];
}

export default function HeroSlider({ games }: HeroSliderProps) {
    const plugin = useRef(
        Autoplay({ delay: 3000, stopOnInteraction: false })
    );

    if (!games || games.length === 0) return null;

    return (
        <div className="w-full relative group">
            <Carousel
                plugins={[plugin.current]}
                className="w-full"
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
            >
                <CarouselContent>
                    {games.map((game) => (
                        <CarouselItem key={game.id}>
                            <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl">
                                {/* 1. KATMAN: Arka Plan */}
                                <div className="absolute inset-0 z-0">
                                    <Image
                                        src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                                        alt={game.name}
                                        fill
                                        className="object-cover opacity-60 blur-sm scale-105"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
                                    <div className="absolute inset-0 bg-linear-to-r from-background via-background/40 to-transparent" />
                                </div>

                                {/* 2. KATMAN: İçerik */}
                                <div className="relative z-10 h-full flex flex-col md:flex-row items-center justify-center md:justify-start gap-6 p-6 md:p-12 lg:px-16">

                                    {/* Poster */}
                                    <div className="hidden md:block relative h-64 w-44 lg:h-80 lg:w-56 shrink-0 rounded-lg overflow-hidden shadow-2xl border border-white/10 -rotate-3 hover:rotate-0 transition-transform duration-500">
                                        <Image
                                            src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                                            alt={game.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    {/* Bilgi Alanı */}
                                    <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 max-w-2xl">

                                        {/* Puanlar ve Etiketler */}
                                        <div className="flex flex-wrap items-center gap-4 mt-2">

                                            {/* METACRITIC (Yeşil Neon) */}
                                            {game.metacriticScore != null && game.metacriticScore > 0 && (
                                                <div className="group relative flex items-center justify-center min-w-[50px] h-[50px] rounded-2xl bg-black/40 backdrop-blur-md border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all duration-300" title="Metacritic Puanı">
                                                    <div className="absolute inset-0 bg-green-500/10 rounded-2xl" />
                                                    <span className="text-xl font-black text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                                                        {game.metacriticScore}
                                                    </span>
                                                    <div className="absolute -top-2 -right-2 bg-black rounded-full p-0.5 border border-green-500/30">
                                                        <Image src={metacriticLogoSrc} alt="Meta" width={14} height={14} className="object-contain" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* RAWG (Mavi Neon) */}
                                            {game.rawgRating != null && game.rawgRating > 0 && (
                                                <div className="group relative flex items-center justify-center min-w-[60px] h-[50px] rounded-2xl bg-black/40 backdrop-blur-md border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all duration-300" title="RAWG Puanı">
                                                    <div className="absolute inset-0 bg-blue-500/10 rounded-2xl" />
                                                    <span className="text-xl font-black text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">
                                                        {game.rawgRating.toFixed(1)}
                                                    </span>
                                                    <div className="absolute -top-2 -right-2 bg-black rounded-full p-0.5 border border-blue-500/30">
                                                        <Image src={rawgLogoSrc} alt="RAWG" width={14} height={14} className="object-contain" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* GGHUB (Mor Neon) */}
                                            {game.gghubRating > 0 && (
                                                <div className="group relative flex items-center justify-center min-w-[60px] h-[50px] rounded-2xl bg-black/40 backdrop-blur-md border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-300" title="GGHub Puanı">
                                                    <div className="absolute inset-0 bg-purple-500/10 rounded-2xl" />
                                                    <span className="text-xl font-black text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">
                                                        {game.gghubRating.toFixed(1)}
                                                    </span>
                                                    <div className="absolute -top-2 -right-2 bg-black rounded-full p-0.5 border border-purple-500/30">
                                                        <Image src={logoSrc} alt="GGHub" width={14} height={14} className="object-contain" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Çıkış Yılı (Sade) */}
                                            <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/20 text-white/70 text-xs font-medium backdrop-blur-sm">
                                                {game.releaseDate ? new Date(game.releaseDate).getFullYear() : "TBA"}
                                            </div>

                                            {/* Platformlar */}
                                            {game.platforms && game.platforms.length > 0 && (
                                                <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm">
                                                    <PlatformIcons platforms={game.platforms} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Başlık */}
                                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground drop-shadow-xl line-clamp-2">
                                            {game.name}
                                        </h2>

                                        {/* Açıklama */}
                                        {game.description && (
                                            <p className="text-sm md:text-base text-muted-foreground line-clamp-3 max-w-2xl">
                                                {game.description}
                                            </p>
                                        )}

                                        {/* Aksiyon Butonu */}
                                        <div className="flex justify-center md:justify-start pt-2">
                                            <Link href={`/games/${game.slug || game.rawgId}`}>
                                                <Button size="lg" className="gap-2 font-semibold text-md shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer">
                                                    <Play className="w-4 h-4 fill-current" /> İncelemeye Başla
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>

                {/* Navigasyon Okları */}
                <div className="absolute right-12 bottom-12 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <CarouselPrevious className="static translate-y-0 bg-background/50 backdrop-blur border-border" />
                    <CarouselNext className="static translate-y-0 bg-background/50 backdrop-blur border-border" />
                </div>
            </Carousel>
        </div>
    );
}