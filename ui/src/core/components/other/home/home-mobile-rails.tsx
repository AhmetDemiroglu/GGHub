"use client";

import Image from "next/image";
import Link from "next/link";
import { Crown, Flame, Star, Trophy } from "lucide-react";
import { HomeGame, LeaderboardUser } from "@/models/home/home.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";

interface HomeMobileRailsProps {
    trending: HomeGame[];
    leaders: LeaderboardUser[];
}

/**
 * Mobil/tablet (<xl) için kompakt yatay şeritler. Trending + liderlik tablosunu
 * dikey alanı az kaplayacak şekilde yatay kaydırılabilir gösterir; böylece
 * altındaki aktivite akışı X-benzeri kesintisiz sonsuz scroll olarak kalır.
 */
export default function HomeMobileRails({ trending, leaders }: HomeMobileRailsProps) {
    const locale = useCurrentLocale();
    const t = useI18n();

    const hasTrending = trending.length > 0;
    const hasLeaders = leaders.length > 0;

    if (!hasTrending && !hasLeaders) return null;

    return (
        <div className="space-y-5">
            {hasTrending ? (
                <section>
                    <div className="mb-2.5 flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <h3 className="text-sm font-bold tracking-tight">{t("home.trendingTitle")}</h3>
                    </div>
                    <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                        {trending.slice(0, 10).map((game, index) => (
                            <Link
                                key={game.id}
                                href={buildLocalizedPathname(`/games/${game.slug || game.rawgId}`, locale)}
                                className="group w-[124px] shrink-0 snap-start"
                            >
                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/50 shadow-sm">
                                    <Image
                                        src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                                        alt={game.name}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        sizes="124px"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/60 text-[10px] font-bold text-white backdrop-blur-sm">
                                        {index + 1}
                                    </span>
                                    {game.gghubRating > 0 ? (
                                        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                                            <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                                            <span className="text-[10px] font-bold text-white">{game.gghubRating.toFixed(1)}</span>
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1.5 truncate text-xs font-semibold transition-colors group-hover:text-primary">{game.name}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : null}

            {hasLeaders ? (
                <section>
                    <div className="mb-2.5 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <h3 className="text-sm font-bold tracking-tight">{t("home.leaderboardTitle")}</h3>
                    </div>
                    <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
                        {leaders.slice(0, 10).map((leader, index) => (
                            <Link
                                key={leader.userId}
                                href={buildLocalizedPathname(`/profiles/${leader.username}`, locale)}
                                className="group flex w-[100px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card/50 p-3 text-center transition-colors hover:bg-card/80"
                            >
                                <div className="relative">
                                    <Avatar className="h-12 w-12 border border-border transition-colors group-hover:border-primary">
                                        <AvatarImage src={getImageUrl(leader.profileImageUrl) || ""} alt={leader.username} className="object-cover" />
                                        <AvatarFallback className="text-sm">{leader.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span
                                        className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                            index === 0
                                                ? "bg-yellow-500 text-black"
                                                : index === 1
                                                  ? "bg-gray-300 text-black"
                                                  : index === 2
                                                    ? "bg-amber-700 text-white"
                                                    : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {index === 0 ? <Crown className="h-2.5 w-2.5" /> : index + 1}
                                    </span>
                                </div>
                                <p className="max-w-full truncate text-xs font-semibold transition-colors group-hover:text-primary">{leader.username}</p>
                                <span className="text-[10px] font-medium text-primary">
                                    {t("home.levelShort")} {leader.level}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
