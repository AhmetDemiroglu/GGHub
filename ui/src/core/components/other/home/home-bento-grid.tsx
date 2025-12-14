"use client";

import Image from "next/image";
import Link from "next/link";
import { HomeGame, LeaderboardUser } from "@/models/home/home.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { TrendingUp, Trophy, Star, Crown } from "lucide-react";
import { getImageUrl } from "@/core/lib/get-image-url";
import { ScrollArea } from "@/core/components/ui/scroll-area";

interface HomeBentoGridProps {
    trending: HomeGame[];
    leaders: LeaderboardUser[];
}

export default function HomeBentoGrid({ trending, leaders }: HomeBentoGridProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* SOL TARAF: GGHub Trendleri (Geniş Alan - 2/3) */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">GGHub&apos;da Yükselenler</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {trending.slice(0, 6).map((game, index) => (
                        <Link href={`/games/${game.slug || game.rawgId}`} key={game.id} className="group">
                            <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="relative aspect-3/4 w-full overflow-hidden">
                                    <Image
                                        src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                                        alt={game.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        sizes="(max-width: 768px) 50vw, 33vw"
                                    />
                                    {/* Sıralama Rozeti */}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md border border-white/10">
                                        #{index + 1}
                                    </div>
                                    {/* Rating */}
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-yellow-500/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        <Star className="w-3 h-3 fill-current" />
                                        {game.gghubRating > 0 ? game.gghubRating.toFixed(1) : "-"}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors" title={game.name}>
                                        {game.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Popüler
                                    </p>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* SAĞ TARAF: Liderlik Tablosu (Dar Alan - 1/3) */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">Haftanın Liderleri</h3>
                </div>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-fit">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            En Yüksek XP Kazananlar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[380px] px-4">
                            <div className="space-y-4 py-2">
                                {leaders.map((user, index) => (
                                    <Link href={`/profiles/${user.username}`} key={user.userId}>
                                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                                            {/* Sıralama Numarası */}
                                            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-yellow-500 text-black shadow-yellow-500/20 shadow-lg" :
                                                index === 1 ? "bg-gray-300 text-black" :
                                                    index === 2 ? "bg-amber-700 text-white" :
                                                        "bg-muted text-muted-foreground"
                                                }`}>
                                                {index === 0 ? <Crown className="w-3 h-3" /> : index + 1}
                                            </div>

                                            {/* Avatar */}
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 border border-border group-hover:border-primary transition-colors">
                                                    <AvatarImage
                                                        src={getImageUrl(user.profileImageUrl) || ""}
                                                        alt={user.username}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            </div>

                                            {/* Bilgiler */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                                        {user.username}
                                                    </p>
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                        Lvl {user.level}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {user.levelName}
                                                    </p>
                                                    <span className="text-xs font-medium text-primary">
                                                        {user.xp.toLocaleString()} XP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}

                                {leaders.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Henüz veri yok.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* CTA Box - Sadece görsel amaçlı */}
                <div className="rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 p-4 text-white shadow-lg mt-4">
                    <p className="font-bold text-sm">Zirveye Oyna! 🚀</p>
                    <p className="text-xs text-white/80 mt-1">İnceleme yap, liste oluştur ve XP kazanarak liderlik tablosunda yerini al.</p>
                </div>
            </div>
        </div>
    );
}