"use client";

import { useEffect, useState } from "react";
import { getPersonalizedFeed } from "@/api/activity/activity.api";
import { getSuggestedUsers } from "@/api/social/social.api";
import { getHomeContent } from "@/api/home/home.api";
import { Activity } from "@/models/activity/activity.model";
import { HomeContent } from "@/models/home/home.model";
import { SuggestedUser } from "@/models/social/social.model";
import { useAuth } from "@/core/hooks/use-auth";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { Skeleton } from "@/core/components/ui/skeleton";
import HeroSlider from "./hero-slider";
import HomePeopleSuggestions from "./home-people-suggestions";
import HomeRightSidebar from "./home-right-sidebar";
import HomeSocialFeed from "./home-social-feed";
import HomeStatsBar from "./home-stats-bar";

export default function HomeView() {
    const locale = useCurrentLocale();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [content, setContent] = useState<HomeContent | null>(null);
    const [feed, setFeed] = useState<Activity[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Auth henüz yüklenmediyse fetch yapma: boş feed ve çift istek olmasın
        if (authLoading) return;

        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoading(true);
                // Paralel fetch: üç isteği aynı anda başlat (öneriler best-effort)
                const [homeData, feedData, suggestionData] = await Promise.all([
                    getHomeContent(),
                    isAuthenticated ? getPersonalizedFeed() : Promise.resolve([]),
                    isAuthenticated ? getSuggestedUsers(12).catch(() => []) : Promise.resolve([]),
                ]);
                if (!cancelled) {
                    setContent(homeData);
                    setFeed(feedData);
                    setSuggestions(suggestionData);
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

            {isAuthenticated && suggestions.length > 0 ? (
                <HomePeopleSuggestions suggestions={suggestions} />
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                    <HomeSocialFeed initialActivities={feed} isAuthenticated={isAuthenticated} />
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
            <Skeleton className="h-[340px] w-full rounded-2xl md:h-[420px]" />
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
