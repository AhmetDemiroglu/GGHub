"use client";

import { useEffect, useState } from "react";
import { getHomeContent } from "@/api/home/home.api";
import { getPersonalizedFeed } from "@/api/activity/activity.api";
import { HomeContent } from "@/models/home/home.model";
import { Activity } from "@/models/activity/activity.model";
import HeroSlider from "./hero-slider";
import HomeBentoGrid from "./home-bento-grid";
import HomeFeed from "./home-feed";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useAuth } from "@/core/hooks/use-auth";

export default function HomeView() {
    const { user, isAuthenticated } = useAuth(); 
    const [content, setContent] = useState<HomeContent | null>(null);
    const [feed, setFeed] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Vitrin verilerini çek
                const homeData = await getHomeContent();
                setContent(homeData);

                // 2. Giriş yapmışsa Feed çek
                if (isAuthenticated) {
                    const feedData = await getPersonalizedFeed();
                    setFeed(feedData);
                }
            } catch (error) {
                console.error("Home data fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated]);

    if (loading) {
        return <HomeSkeleton />;
    }

    if (!content) return null;

    return (
        <div className="space-y-6 md:space-y-8 pb-10 animate-in fade-in duration-500">
            {/* 1. Hero Bölümü */}
            <section>
                <HeroSlider games={content.heroGames} />
            </section>

            {/* 2. Ana İçerik Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">

                {/* Sol/Orta Kolon: Vitrin (Trendler & Leaderboard) - 3/4 Genişlik */}
                <div className="xl:col-span-3">
                    <HomeBentoGrid trending={content.trendingLocal} leaders={content.topGamers} />
                </div>

                {/* Sağ Kolon: Sosyal Akış (Feed) */}
                <div className="xl:col-span-1 h-full min-h-[500px]">
                    <div className="sticky top-4 h-[calc(100vh-100px)]">
                        <HomeFeed activities={feed} isAuthenticated={isAuthenticated} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function HomeSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="w-full h-[400px] md:h-[500px] rounded-2xl" />
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                    </div>
                    <Skeleton className="h-96 rounded-xl" />
                </div>
                <Skeleton className="xl:col-span-1 h-96 rounded-xl" />
            </div>
        </div>
    );
}