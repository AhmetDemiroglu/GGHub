"use client";

import Image from "next/image";
import Link from "next/link";
import { Crown, Flame, Star, Trophy } from "lucide-react";
import { HomeGame, LeaderboardUser } from "@/models/home/home.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";

interface HomeRightSidebarProps {
    trending: HomeGame[];
    leaders: LeaderboardUser[];
}

export default function HomeRightSidebar({ trending, leaders }: HomeRightSidebarProps) {
    const locale = useCurrentLocale();
    const t = useI18n();

    return (
        <div className="space-y-6">
            <div>
                <div className="mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <h3 className="text-sm font-bold tracking-tight">{t("home.trendingTitle")}</h3>
                </div>
                <div className="space-y-2">
                    {trending.slice(0, 8).map((game, index) => (
                        <Link
                            href={buildLocalizedPathname(`/games/${game.slug || game.rawgId}`, locale)}
                            key={game.id}
                            className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                        >
                            <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${index < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                {index + 1}
                            </span>
                            <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded">
                                <Image src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"} alt={game.name} fill className="object-cover" sizes="32px" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold transition-colors group-hover:text-primary">{game.name}</p>
                                <div className="mt-0.5 flex items-center gap-1">
                                    <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                                    <span className="text-[10px] text-muted-foreground">{game.gghubRating > 0 ? game.gghubRating.toFixed(1) : "-"}</span>
                                    {game.gghubRatingCount > 0 ? <span className="text-[10px] text-muted-foreground">({game.gghubRatingCount})</span> : null}
                                </div>
                            </div>
                        </Link>
                    ))}
                    {trending.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">{t("home.trendingEmpty")}</p> : null}
                </div>
            </div>

            <div>
                <div className="mb-3 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <h3 className="text-sm font-bold tracking-tight">{t("home.leaderboardTitle")}</h3>
                </div>
                <div className="space-y-1">
                    {leaders.map((user, index) => (
                        <Link href={buildLocalizedPathname(`/profiles/${user.username}`, locale)} key={user.userId}>
                            <div className="group flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted/50">
                                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                    index === 0 ? "bg-yellow-500 text-black" : index === 1 ? "bg-gray-300 text-black" : index === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                    {index === 0 ? <Crown className="h-2.5 w-2.5" /> : index + 1}
                                </div>
                                <Avatar className="h-7 w-7 border border-border transition-colors group-hover:border-primary">
                                    <AvatarImage src={getImageUrl(user.profileImageUrl) || ""} alt={user.username} className="object-cover" />
                                    <AvatarFallback className="text-[10px]">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold transition-colors group-hover:text-primary">{user.username}</p>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                            {t("home.levelShort")} {user.level}
                                        </Badge>
                                        <span className="text-[10px] font-medium text-primary">{user.xp.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")} XP</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {leaders.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">{t("home.leaderboardEmpty")}</p> : null}
                </div>
            </div>

            <Link href={buildLocalizedPathname("/discover", locale)} className="group block rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:border-primary/30">
                <p className="text-sm font-semibold transition-colors group-hover:text-primary">{t("home.discoverTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("home.discoverDescription")}</p>
            </Link>
        </div>
    );
}
