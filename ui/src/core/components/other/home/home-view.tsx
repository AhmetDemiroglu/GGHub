"use client";

import { useEffect, useState } from "react";
import { getPersonalizedFeed } from "@/api/activity/activity.api";
import { getHomeContent } from "@/api/home/home.api";
import { Activity } from "@/models/activity/activity.model";
import { HomeContent } from "@/models/home/home.model";
import { useAuth } from "@/core/hooks/use-auth";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { Skeleton } from "@/core/components/ui/skeleton";
import HeroSlider from "./hero-slider";
import HomeRightSidebar from "./home-right-sidebar";
import HomeSocialFeed from "./home-social-feed";
import HomeStatsBar from "./home-stats-bar";

export default function HomeView() {
    const locale = useCurrentLocale();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [content, setContent] = useState<HomeContent | null>(null);
    const [feed, setFeed] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Auth henüz yüklenmediyse fetch yapma — boş feed ve çift istek olmasın
        if (authLoading) return;

        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoading(true);
                // Paralel fetch — her iki isteği aynı anda başlat
                const [homeData, feedData] = await Promise.all([
                    getHomeContent(),
                    isAuthenticated ? getPersonalizedFeed() : Promise.resolve([]),
                ]);
                if (!cancelled) {
                    setContent(homeData);
                    setFeed(feedData);
                }
            } catch (error) {
                console.error("Home data fetch error:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [isAuthenticated, authLoading, locale]);

    if (loading || authLoading) {
        return <HomeSkeleton />;
    }

    if (!content) {
        return null;
    }

    return (
        <div className="animate-in space-y-5 pb-10 fade-in duration-500">
            <section>
                <HeroSlider games={content.heroGames} />
            </section>

            {content.siteStats ? (
                <section>
                    <HomeStatsBar stats={content.siteStats} />
                </section>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                    <HomeSocialFeed activities={feed} isAuthenticated={isAuthenticated} />
                </div>

                <aside className="xl:col-span-4">
                    <div className="sticky top-4">
                        <HomeRightSidebar trending={content.trendingLocal} leaders={content.topGamers} />
                    </div>
                </aside>
            </div>
        </div>
    );
}

function HomeSkeleton() {
    return (
        <div className="space-y-5">
            <Skeleton className="h-[300px] w-full rounded-2xl md:h-[360px]" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-3 xl:col-span-8">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-xl" />
                    ))}
                </div>
                <div className="space-y-4 xl:col-span-4">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
