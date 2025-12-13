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
                <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                            <Award className="h-4 w-4 text-yellow-500" />
                            Kazanılan Rozetler
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        {stats.recentAchievements && stats.recentAchievements.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {stats.recentAchievements.map((iconUrl, index) => (
                                    <div
                                        key={index}
                                        className="relative h-10 w-10 bg-background/50 rounded-full border border-border/50 p-1.5 shadow-sm hover:scale-110 transition-transform cursor-help group"
                                        title="Rozet Detayı"
                                    >
                                        <Image
                                            src={iconUrl}
                                            alt="Achievement Badge"
                                            fill
                                            className="object-contain drop-shadow-md"
                                            unoptimized={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground py-2 text-center bg-muted/20 rounded-md border border-dashed border-muted">
                                Henüz rozet kazanılmadı.
                            </div>
                        )}
                    </CardContent>
                </Card>

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