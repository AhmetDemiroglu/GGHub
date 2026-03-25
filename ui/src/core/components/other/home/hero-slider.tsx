"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Play } from "lucide-react";
import { gameApi } from "@/api/gaming/game.api";
import { HomeGame } from "@/models/home/home.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import { buildLocalizedPathname } from "@/i18n/config";
import { Button } from "@/core/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/core/components/ui/carousel";
import { PlatformIcons } from "@/core/components/other/platform-icons";
import logoSrc from "@core/assets/logo.png";
import metacriticLogoSrc from "@core/assets/metacritic_logo.png";
import rawgLogoSrc from "@core/assets/rawg_logo.png";

interface HeroSliderProps {
    games: HomeGame[];
}

const normalizeDescription = (value: string | null | undefined) => {
    if (!value) return null;

    const plainText = value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    return plainText || null;
};

export default function HeroSlider({ games }: HeroSliderProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));
    const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});

    if (!games || games.length === 0) {
        return null;
    }

    useEffect(() => {
        let cancelled = false;

        const gamesNeedingDescription = games.filter((game) => {
            const key = `${locale}:${game.id || game.rawgId}`;
            return !normalizeDescription(game.description) && !descriptionOverrides[key];
        });

        if (gamesNeedingDescription.length === 0) {
            return;
        }

        const fillMissingDescriptions = async () => {
            const resolvedEntries = await Promise.all(
                gamesNeedingDescription.map(async (game) => {
                    try {
                        const detail = await gameApi.getById(game.slug || String(game.rawgId));
                        const localizedDescription = locale === "tr"
                            ? normalizeDescription(detail.descriptionTr)
                            : normalizeDescription(detail.description);

                        return localizedDescription
                            ? [`${locale}:${game.id || game.rawgId}`, localizedDescription] as const
                            : null;
                    } catch {
                        return null;
                    }
                }),
            );

            if (cancelled) {
                return;
            }

            const nextOverrides = resolvedEntries.reduce<Record<string, string>>((accumulator, entry) => {
                if (!entry) {
                    return accumulator;
                }

                accumulator[entry[0]] = entry[1];
                return accumulator;
            }, {});

            if (Object.keys(nextOverrides).length > 0) {
                setDescriptionOverrides((current) => ({ ...current, ...nextOverrides }));
            }
        };

        void fillMissingDescriptions();

        return () => {
            cancelled = true;
        };
    }, [games, locale, descriptionOverrides]);

    return (
        <div className="group relative w-full">
            <Carousel plugins={[plugin.current]} className="w-full" onMouseEnter={plugin.current.stop} onMouseLeave={plugin.current.reset}>
                <CarouselContent>
                    {games.map((game) => {
                        const descriptionKey = `${locale}:${game.id || game.rawgId}`;
                        const resolvedDescription = normalizeDescription(game.description) ?? descriptionOverrides[descriptionKey] ?? null;

                        return (
                            <CarouselItem key={game.id}>
                                <div className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl md:h-[360px]">
                                <div className="absolute inset-0 z-0">
                                    <Image
                                        src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                                        alt={game.name}
                                        fill
                                        className="scale-105 object-cover opacity-60 blur-sm"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
                                    <div className="absolute inset-0 bg-linear-to-r from-background via-background/40 to-transparent" />
                                </div>

                                <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 p-6 text-center md:flex-row md:justify-start md:p-12 md:text-left lg:px-16">
                                    <div className="relative hidden h-48 w-32 shrink-0 -rotate-2 overflow-hidden rounded-lg border border-white/10 shadow-2xl transition-transform duration-500 hover:rotate-0 md:block lg:h-56 lg:w-40">
                                        <Image src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"} alt={game.name} fill className="object-cover" />
                                    </div>

                                    <div className="flex max-w-2xl flex-col items-center space-y-4 md:items-start">
                                        <div className="mt-2 flex flex-wrap items-center gap-4">
                                            {game.metacriticScore != null && game.metacriticScore > 0 ? (
                                                <div className="group relative flex h-[50px] min-w-[50px] items-center justify-center rounded-2xl border border-green-500/30 bg-black/40 shadow-[0_0_15px_rgba(34,197,94,0.2)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]" title="Metacritic">
                                                    <div className="absolute inset-0 rounded-2xl bg-green-500/10" />
                                                    <span className="text-xl font-black text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">{game.metacriticScore}</span>
                                                    <div className="absolute -right-2 -top-2 rounded-full border border-green-500/30 bg-black p-0.5">
                                                        <Image src={metacriticLogoSrc} alt="Metacritic" width={14} height={14} className="object-contain" />
                                                    </div>
                                                </div>
                                            ) : null}

                                            {game.rawgRating != null && game.rawgRating > 0 ? (
                                                <div className="group relative flex h-[50px] min-w-[60px] items-center justify-center rounded-2xl border border-blue-500/30 bg-black/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]" title="RAWG">
                                                    <div className="absolute inset-0 rounded-2xl bg-blue-500/10" />
                                                    <span className="text-xl font-black text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">{game.rawgRating.toFixed(1)}</span>
                                                    <div className="absolute -right-2 -top-2 rounded-full border border-blue-500/30 bg-black p-0.5">
                                                        <Image src={rawgLogoSrc} alt="RAWG" width={14} height={14} className="object-contain" />
                                                    </div>
                                                </div>
                                            ) : null}

                                            {game.gghubRating > 0 ? (
                                                <div className="group relative flex h-[50px] min-w-[60px] items-center justify-center rounded-2xl border border-purple-500/30 bg-black/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]" title="GGHub">
                                                    <div className="absolute inset-0 rounded-2xl bg-purple-500/10" />
                                                    <span className="text-xl font-black text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">{game.gghubRating.toFixed(1)}</span>
                                                    <div className="absolute -right-2 -top-2 rounded-full border border-purple-500/30 bg-black p-0.5">
                                                        <Image src={logoSrc} alt="GGHub" width={14} height={14} className="object-contain" />
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
                                                {game.releaseDate ? new Date(game.releaseDate).getFullYear() : t("common.tba")}
                                            </div>

                                            {game.platforms && game.platforms.length > 0 ? (
                                                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 backdrop-blur-sm">
                                                    <PlatformIcons platforms={game.platforms} />
                                                </div>
                                            ) : null}
                                        </div>

                                        <h2 className="line-clamp-2 text-2xl font-black tracking-tighter text-foreground drop-shadow-xl md:text-3xl lg:text-4xl">{game.name}</h2>

                                        {resolvedDescription ? <p className="line-clamp-2 max-w-xl text-xs text-muted-foreground md:text-sm">{resolvedDescription}</p> : null}

                                        <div className="flex justify-center pt-2 md:justify-start">
                                            <Link href={buildLocalizedPathname(`/games/${game.slug || game.rawgId}`, locale)}>
                                                <Button size="lg" className="cursor-pointer gap-2 text-md font-semibold transition-transform hover:scale-105">
                                                    <Play className="h-4 w-4 fill-current" />
                                                    {t("home.heroCta")}
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                </div>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>

                <div className="absolute bottom-12 right-12 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <CarouselPrevious className="static translate-y-0 border-border bg-background/50 backdrop-blur" />
                    <CarouselNext className="static translate-y-0 border-border bg-background/50 backdrop-blur" />
                </div>
            </Carousel>
        </div>
    );
}
