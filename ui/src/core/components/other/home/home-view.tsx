"use client";

import { useEffect, useState } from "react";
import { getSuggestedUsers } from "@/api/social/social.api";
import { getSuggestedAgents } from "@/api/ai/ai-club.api";
import { getHomeContent } from "@/api/home/home.api";
import { HomeContent } from "@/models/home/home.model";
import { SuggestedUser } from "@/models/social/social.model";
import { useAuth } from "@/core/hooks/use-auth";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import HeroSlider from "./hero-slider";
import HomeMobileRails from "./home-mobile-rails";
import HomePeopleSuggestions from "./home-people-suggestions";
import HomeRightSidebar from "./home-right-sidebar";
import HomeSocialFeed from "./home-social-feed";
import HomeStatsBar from "./home-stats-bar";

export default function HomeView({ initialContent = null }: { initialContent?: HomeContent | null }) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [content, setContent] = useState<HomeContent | null>(initialContent);
    const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
    const [agentSuggestions, setAgentSuggestions] = useState<SuggestedUser[]>([]);
    // Sunucu içeriği hazır getirdiyse skeleton'a hiç düşme: hero, trending ve liderlik
    // tablosu ilk HTML'de geliyor, LCP görseli hydration'ı beklemiyor.
    const [loading, setLoading] = useState(initialContent === null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        // Auth henüz yüklenmediyse fetch yapma: boş feed ve çift istek olmasın
        if (authLoading) return;

        // Sunucudan gelen içerik varsa ve kullanıcı anonimse çekilecek bir şey yok.
        // (feed ve öneriler yalnızca giriş yapmış kullanıcı için anlamlı)
        const needsContent = content === null || retryCount > 0;
        if (!needsContent && !isAuthenticated) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        const fetchData = async () => {
            try {
                if (needsContent) setLoading(true);
                // Paralel fetch: istekleri aynı anda başlat. Feed ve öneriler best-effort:
                // Promise.all fail-fast olduğu için her biri kendi içinde yakalanır, aksi
                // halde yalnızca feed düşse bile ana içerik gelmiş sayılmayıp sayfa komple
                // boş kalıyordu.
                // Akış artık BURADAN çekilmiyor. Önceden ilk sayfa burada alınıp
                // HomeSocialFeed'e prop olarak veriliyor ve "Hepsi" sekmesi yalnızca
                // ona bağlı kalıyordu; istek başarısız olunca (hata sessizce yutuluyordu)
                // o sekme kalıcı olarak boş kalıyordu. Artık her sekme kendi verisini
                // kendisi çekiyor ve hatada yeniden deneyebiliyor.
                const [homeData, suggestionData, agentData] = await Promise.all([
                    needsContent ? getHomeContent() : Promise.resolve(content),
                    isAuthenticated ? getSuggestedUsers(12).catch(() => []) : Promise.resolve([]),
                    isAuthenticated ? getSuggestedAgents(8).catch(() => []) : Promise.resolve([]),
                ]);
                if (!cancelled) {
                    setContent(homeData);
                    setSuggestions(suggestionData);
                    setAgentSuggestions(agentData);
                }
            } catch (error) {
                console.error("Home data fetch error:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
        // content bilerek bağımlılık listesinde değil: setContent sonrası effect'i yeniden
        // tetikleyip sonsuz döngü oluştururdu.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, authLoading, locale, retryCount]);

    // Hero HER durumda cizilir, veri gelmeden once sabit slaytlarla. Lighthouse'ta LCP elemani
    // hero'daki promo basligi ve LCP'nin %90'i "render delay" olculdu (8 sn): sunucu fetch'i
    // basarisiz olunca (Railway yeniden deploy aninda 5xx, zaman asimi) sayfa komple iskelete
    // dusuyor, baslik ancak hydration + istemci fetch'i sonrasi boyaniyordu. Sabit slaytlar
    // veriden bagimsiz; oyun slaytlari icerik gelince eklenir (embla slayt degisimini izler).
    // fade-in de YOK: icerik fallback'teki promo slaytinin yerine oturuyor, 500 ms opacity 0
    // hero'yu bir an bosaltirdi (Lighthouse bunu "non-composited" diye de isaretliyordu).
    const isPending = content === null && (loading || authLoading);

    return (
        <div className="space-y-5 pb-10">
            <section>
                <HeroSlider games={content?.heroGames ?? []} />
            </section>

            {content ? (
                <>
                    {content.siteStats ? (
                        <section>
                            <HomeStatsBar stats={content.siteStats} />
                        </section>
                    ) : null}

                    {isAuthenticated && (suggestions.length > 0 || agentSuggestions.length > 0) ? (
                        <HomePeopleSuggestions suggestions={suggestions} agents={agentSuggestions} />
                    ) : null}

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                        {/* Feed sütunu: mobilde trending/liderlik kompakt şeritler üstte,
                            ardından akış en altta kesintisiz sonsuz scroll olarak akar. */}
                        <div className="space-y-5 xl:col-span-8">
                            <div className="xl:hidden">
                                <HomeMobileRails trending={content.trendingLocal} leaders={content.topGamers} />
                            </div>
                            <HomeSocialFeed isAuthenticated={isAuthenticated} />
                        </div>

                        {/* Desktop sidebar: viewport'a sabit; içeriği taşarsa sayfa dışına
                            çıkmak yerine kendi içinde kayar (liderlik tablosu hep erişilebilir). */}
                        <aside className="hidden xl:col-span-4 xl:block">
                            <div className="no-scrollbar sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
                                <HomeRightSidebar trending={content.trendingLocal} leaders={content.topGamers} />
                            </div>
                        </aside>
                    </div>
                </>
            ) : isPending ? (
                <HomeSkeleton />
            ) : (
                // Ana içerik alınamadı. Eskiden burada null dönülüyordu: kullanıcı sessizce BOMBOŞ
                // bir sayfa görüyor ve F5 atmak zorunda kalıyordu. Artık hata + tekrar dene gösterilir.
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
                    <p className="text-muted-foreground text-sm">{t("common.genericError")}</p>
                    <Button variant="outline" onClick={() => setRetryCount((count) => count + 1)}>
                        {t("common.tryAgain")}
                    </Button>
                </div>
<<<<<<< HEAD
            )}
=======

                {/* Desktop sidebar: viewport'a sabit; içeriği taşarsa sayfa dışına
                    çıkmak yerine kendi içinde kayar (liderlik tablosu hep erişilebilir). */}
                <aside className="hidden xl:col-span-4 xl:block">
                    <div className="no-scrollbar sticky top-[calc(var(--topbar-h)+1rem)] max-h-[calc(100dvh-var(--topbar-h)-2rem)] overflow-y-auto">
                        <HomeRightSidebar trending={content.trendingLocal} leaders={content.topGamers} />
                    </div>
                </aside>
            </div>
>>>>>>> origin/claude/great-tesla-etsso4
        </div>
    );
}

/** Hero'nun ALTINDAKI bolumlerin iskeleti; hero'nun kendisi her zaman gercek cizilir. */
function HomeSkeleton() {
    return (
        <div className="space-y-5">
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
