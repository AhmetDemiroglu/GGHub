"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserStats } from "@/api/stats/stats.api";
import { getUserActivityFeed } from "@/api/activity/activity.api";
import GamerDNAChart from "./gamer-dna-chart";
import ActivityFeed from "./activity-feed";
import { Loader2, TrendingUp, Users, List, Star, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import TopFiveGames from "./top-five-games";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";

interface ProfileOverviewProps {
    username: string;
}

export default function ProfileOverview({ username }: ProfileOverviewProps) {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["user-stats", username],
        queryFn: () => getUserStats(username),
    });

    const { data: activities, isLoading: activityLoading } = useQuery({
        queryKey: ["user-activity", username],
        queryFn: () => getUserActivityFeed(username),
    });

    if (statsLoading || activityLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in-50 duration-500">
            {/* SOL KOLON: Özet İstatistikler & DNA (Bento Grid) */}
            <div className="md:col-span-1 space-y-3">
                {/* Gamer DNA Chart (Kare Alan) */}
                <div className="h-[300px]">
                    <GamerDNAChart data={stats.gamerDna} username={username} />
                </div>
                {/* Rozet Vitrini */}
                <div className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-linear-to-br from-card via-card/50 to-muted/50 p-4 shadow-sm backdrop-blur-sm">
                    <div className="absolute -top-10 -right-10 h-32 w-32 bg-yellow-500/10 blur-[50px] rounded-full pointer-events-none" />

                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                            <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                        </div>
                        <h3 className="font-semibold text-foreground tracking-tight">Rozet Koleksiyonu</h3>
                    </div>

                    <div className="min-h-20">
                        {stats.recentAchievements && stats.recentAchievements.length > 0 ? (
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {stats.recentAchievements.map((badge, index) => (
                                    <TooltipProvider key={index}>
                                        <Tooltip delayDuration={200}>
                                            <TooltipTrigger asChild>
                                                <div className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all duration-300 cursor-help hover:-translate-y-1 border border-transparent hover:border-border/50">
                                                    {/* İkon Kutusu */}
                                                    <div className="relative h-12 w-12 drop-shadow-md group-hover:drop-shadow-xl transition-all">
                                                        <Image
                                                            src={badge.iconUrl}
                                                            alt={badge.title}
                                                            fill
                                                            className="object-contain"
                                                            unoptimized={true}
                                                        />
                                                    </div>
                                                    {/* Rozet İsmi */}
                                                    <span className="text-[10px] font-medium text-center text-muted-foreground group-hover:text-primary transition-colors line-clamp-1 w-full">
                                                        {badge.title}
                                                    </span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p className="text-xs text-muted">{badge.description}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 border border-dashed border-border rounded-lg bg-muted/20">
                                <Award className="h-8 w-8 text-muted-foreground/30" />
                                <span className="text-xs text-muted-foreground">Henüz vitrinde rozet yok.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* İstatistik Kartları Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Star className="h-5 w-5 text-primary mb-1" />
                            <span className="text-2xl font-bold">{stats.totalReviews}</span>
                            <span className="text-xs text-muted-foreground">İnceleme</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-500/5 border-blue-500/10">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <List className="h-5 w-5 text-blue-500 mb-1" />
                            <span className="text-2xl font-bold">{stats.totalGamesListed}</span>
                            <span className="text-xs text-muted-foreground">Listeleme</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-500/5 border-purple-500/10 col-span-2">
                        <CardContent className="p-4 flex flex-row items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold">{stats.totalFollowers}</span>
                                <span className="text-xs text-muted-foreground">Takipçi</span>
                            </div>
                            <Users className="h-8 w-8 text-purple-500/50" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SAĞ KOLON */}
            <div className="md:col-span-2 space-y-3">

                {/* Top 5 Favoriler */}
                <TopFiveGames username={username} />

                {/* Aktivite Akışı */}
                <Card className="h-full border-border/50 bg-transparent shadow-none">
                    <CardHeader className="px-0 pt-0 pb-0">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            Son Aktiviteler
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ActivityFeed activities={activities || []} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}