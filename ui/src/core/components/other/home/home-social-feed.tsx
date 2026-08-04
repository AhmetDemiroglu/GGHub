"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { getFeedByTab } from "@/api/activity/activity.api";
import { useInfiniteScroll } from "@/core/hooks/use-infinite-scroll";
import { Activity, ActivityActor, ActivityType } from "@/models/activity/activity.model";
import type { Post } from "@/models/post/post.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { enUSMessages } from "@/i18n/messages/en-US";
import { trMessages } from "@/i18n/messages/tr";
import { getImageUrl } from "@/core/lib/get-image-url";
import placeholderGame from "@/core/assets/placeholder.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Skeleton } from "@/core/components/ui/skeleton";
import { MentionText } from "@/core/components/base/mention-text";
import { PostCard } from "@/core/components/other/posts/post-card";
import { PostComposer } from "@/core/components/other/posts/post-composer";
import {
    Activity as ActivityIcon,
    Compass,
    Heart,
    List,
    Loader2,
    MessageCircle,
    MessageSquare,
    Star,
    UserPlus,
} from "lucide-react";

const FEED_PAGE_SIZE = 10;

/**
 * Sekme sirasi mobildeki TAB_ORDER ile birebir: Kesfet, Gonderiler, Incelemeler.
 *
 * Onceki dort sekme (reviews/lists/follows/all) uce indirildi. Listeler ve
 * takipler artik Kesfet icinde; "Hepsi" sekmesinin yerini Kesfet aldi.
 *
 * Kesfet BASTA ve VARSAYILAN: "Gonderiler" yalnizca takip edilenleri gosterir,
 * dolayisiyla yeni ya da az takip eden bir kullanicida bombos acilir. Acilista
 * dolu bir akis gormek icin varsayilan kesif olmali.
 */
type TabKey = "discover" | "posts" | "reviews";

const TAB_ORDER: TabKey[] = ["discover", "posts", "reviews"];

interface TabState {
    items: Activity[];
    hasMore: boolean;
    loading: boolean;
    loaded: boolean;
}

const emptyTab = (): TabState => ({ items: [], hasMore: true, loading: false, loaded: false });

/**
 * Akisin OTURUM ICI hafizasi.
 *
 * Neden modul seviyesinde: bir gonderinin detayina girip geri donuldugunde
 * Next.js bu bileseni yeniden mount ediyor. State bilesende durdugu icin akis
 * sifirdan cekiliyor, kullanici okudugu yeri kaybediyor ve en basa firliyordu.
 * Modul degiskeni istemci tarafi gezinmelerde yasar, sert yenilemede (yeni
 * sayfa yuklemesi) kendiliginden sifirlanir; istenen davranis tam olarak bu.
 *
 * Kaydirma konumu da burada: geri donuste ayni piksele donulur.
 */
interface FeedMemory {
    feeds: Record<TabKey, TabState>;
    activeTab: TabKey;
    /**
     * SEKME BASINA kaydirma konumu.
     *
     * Partial: bir sekmenin kaydi YOKSA (hic ziyaret edilmemis) ile konumu 0
     * OLMASI ayri seyler. Varsayilani 0 saymak, sekme degistirmeyi "sayfanin
     * en basina firlat" davranisina ceviriyordu.
     */
    scrollTopByTab: Partial<Record<TabKey, number>>;
}

let feedMemory: FeedMemory | null = null;

interface HomeSocialFeedProps {
    isAuthenticated: boolean;
}

export default function HomeSocialFeed({ isAuthenticated }: HomeSocialFeedProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    // Varsayılan sekme mobildeki TabbedActivityFeed ile aynı: Keşfet.
    // Buradaki başlangıç değeri ile <Tabs defaultValue> BİRLİKTE değişmeli,
    // yoksa seçili sekme ile listelenen içerik birbirini tutmaz.
    const [activeTab, setActiveTab] = useState<TabKey>(() => feedMemory?.activeTab ?? "discover");
    // Her sekme KENDI sayfasini sunucudan ceker.
    //
    // UC SEKME DE emptyTab() ile basliyor. Onceden "all" sekmesi prop'tan
    // loaded:true ile tohumlaniyordu; on yukleme dongusu onu atliyor, emniyet
    // efekti de !loaded sartina takiliyordu. Besleyen cagri hatayi yutunca
    // ("catch(() => [])") sekme kalici olarak bos kaliyordu: kullanici tikliyor,
    // hicbir sey olmuyordu. Tohumlama tamamen kaldirildi.
    const [feeds, setFeeds] = useState<Record<TabKey, TabState>>(
        () =>
            feedMemory?.feeds ?? {
                discover: emptyTab(),
                posts: emptyTab(),
                reviews: emptyTab(),
            },
    );
    // loadTab closure'ının her render'da güncel listeyi görmesi için ref tutuyoruz.
    const feedsRef = useRef(feeds);
    feedsRef.current = feeds;

    const loadTab = useCallback(async (tab: TabKey, reset: boolean) => {
        const current = feedsRef.current[tab];
        if (current.loading) return;
        if (!reset && current.loaded && !current.hasMore) return;

        setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true } }));

        try {
            // Sayfa içi sıralama skor bazlı olduğundan cursor son eleman değil,
            // eldeki en eski occurredAt olmalı; yoksa kayıt atlanır/yinelenir.
            const cursor = reset
                ? undefined
                : feedsRef.current[tab].items.reduce<string | undefined>(
                      (min, activity) => (min === undefined || activity.occurredAt < min ? activity.occurredAt : min),
                      undefined,
                  );

            const page = await getFeedByTab(tab, FEED_PAGE_SIZE, cursor);

            setFeeds((prev) => {
                const base = reset ? [] : prev[tab].items;
                const seen = new Set(base.map(getActivityKey));
                const fresh = page.filter((activity) => !seen.has(getActivityKey(activity)));
                return {
                    ...prev,
                    [tab]: {
                        items: [...base, ...fresh],
                        // Tüm sayfa yinelenen geldiyse dur; aksi halde aynı sayfa
                        // tekrar tekrar çekilip observer döngüye girer.
                        hasMore: fresh.length > 0 && page.length >= FEED_PAGE_SIZE,
                        loading: false,
                        loaded: true,
                    },
                };
            });
        } catch {
            setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: false, loaded: true, hasMore: false } }));
        }
    }, []);

    /**
     * Yeni gonderiyi akisin basina ANINDA ekler.
     *
     * Onceden yalnizca loadTab("posts", true) cagriliyordu ve iki sorun vardi:
     * varsayilan sekme Kesfet oldugu icin kullanici gonderisini goremiyor, bir
     * de reset yuklenmis sayfalari atip Gonderiler sekmesini basa sariyordu.
     * Simdi donen gonderi kullanicinin kendi gonderilerinin dustugu iki sekmeye
     * (Kesfet ve Gonderiler) istemcide ekleniyor; sunucu beklenmiyor.
     *
     * Alanlar backend'in ActivityDto uretimiyle birebir ayni
     * (bkz. ActivityService.BuildPostCandidatesAsync), dolayisiyla sonraki
     * gercek yenilemede ayni kart sunucudan gelirse getActivityKey ayni cikar
     * ve loadTab'in tekillestirmesi kopyayi eler.
     */
    const prependPost = useCallback((post: Post) => {
        const activity: Activity = {
            id: post.id,
            type: post.repostOf ? ActivityType.Repost : ActivityType.Post,
            occurredAt: post.createdAt,
            actor: post.author,
            postData: post,
        };
        const key = getActivityKey(activity);

        setFeeds((prev) => {
            const next = { ...prev };
            let changed = false;

            for (const tab of ["discover", "posts"] as const) {
                // Henuz yuklenmemis sekmeye dokunma: ilk yukleme gonderiyi zaten
                // sunucudan getirir, araya eklenen kart reset ile silinirdi.
                if (!prev[tab].loaded) continue;
                if (prev[tab].items.some((item) => getActivityKey(item) === key)) continue;

                next[tab] = { ...prev[tab], items: [activity, ...prev[tab].items] };
                changed = true;
            }

            return changed ? next : prev;
        });
    }, []);

    // Her degisimde hafizayi tazele; unmount'ta yazmak yeterli degil, cunku
    // Next.js gezinmesinde cleanup her zaman guvenilir sirada calismiyor.
    useEffect(() => {
        feedMemory = { feeds, activeTab, scrollTopByTab: feedMemory?.scrollTopByTab ?? {} };
    }, [feeds, activeTab]);

    // Kaydirma konumu: kabin kendisi <main>, window degil. Kaydedilen konum
    // AKTIF SEKMEYE yazilir; boylece hem detaydan geri donuste hem de
    // sekmeler arasi gidip gelmede okunan yer korunur.
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    /**
     * Geri yukleme suruyor mu. Dinleyici bu sirada YAZMAMALI.
     *
     * Aksi halde hafiza kendi kendini bozuyordu: sekme degisiminde hedef
     * konuma atlanirken yeni sekmenin kartlari henuz cizilmemis oluyor, kap
     * kisa kaliyor ve tarayici scrollTop'u kirpiyor. Kirpilmis deger de
     * dinleyici uzerinden kayitli konumun ustune yaziliyor ve kullanici geri
     * dondugunde yanlis yerde buluyordu kendini.
     */
    const restoringRef = useRef(false);

    /**
     * Hedef konuma, icerik cizilene kadar birkac kare boyunca deneyerek gider.
     * Tek bir requestAnimationFrame yetmiyor: liste sanallastirilmamis olsa da
     * gorseller ve kart yukseklikleri ilk karede olusmuyor.
     */
    const restoreScroll = useCallback((target: number) => {
        const container = document.querySelector("main");
        if (!container) return;

        restoringRef.current = true;

        // Hedefi TEK sefer yazmak yetmiyor, iki ayri sebeple:
        //
        //  1. Icerik ilk karede tam yuksekligine ulasmiyor (gorseller, kart
        //     yukseklikleri), hedef kirpilabiliyor.
        //  2. Geri navigasyonunda Next.js kendi kaydirma davranisini BIZDEN
        //     SONRA uyguluyor ve kabi tepeye aliyor; tek yazim yarisi kaybediyor
        //     ve kullanici en basta buluyordu kendini.
        //
        // Bu yuzden kisa bir pencere boyunca hedef tekrar tekrar yaziliyor.
        // Pencere kisa (yaklasik yarim saniye), dolayisiyla kullanicinin kendi
        // kaydirmasiyla kavga etmiyor.
        const deadline = Date.now() + 500;

        const tick = () => {
            container.scrollTop = target;

            if (Date.now() < deadline) {
                requestAnimationFrame(tick);
                return;
            }

            requestAnimationFrame(() => {
                restoringRef.current = false;
            });
        };

        requestAnimationFrame(tick);
    }, []);

    /**
     * Konumu kaydeder. SUREKLI bir scroll dinleyicisi BILEREK yok.
     *
     * Dinleyici vardi ve hafizayi kendi kendine bozuyordu: sekme degisiminde
     * yeni sekmenin icerigi daha kisaysa tarayici scrollTop'u kirpiyor, bu
     * kirpma da bir scroll olayi uretiyor ve dinleyici o kirpilmis degeri
     * kaydediyordu. Sonuc: Kesfet'te 2400'de olan kullanici kisa bir sekmeye
     * gecip geri donunce 700'de buluyordu kendini.
     *
     * Konum yalnizca IKI anda gerekiyor: sekme degistirirken ve bilesen
     * sokulurken (detay sayfasina gidis). Ikisinde de acikca yaziliyor.
     */
    const saveScroll = useCallback((tab: TabKey) => {
        const container = document.querySelector("main");
        if (container && feedMemory) feedMemory.scrollTopByTab[tab] = container.scrollTop;
    }, []);

    /**
     * Konumu kaydeder, ama YALNIZCA kullanici kaynakli kaydirmalarda.
     *
     * Iki tuzak birden var:
     *
     * 1. Unmount'ta kaydetmek yetmiyor. Detay sayfasina gidilirken Next.js
     *    yeni sayfayi cizip kabi tepeye aliyor; temizlik calistiginda scrollTop
     *    coktan 0 oluyor ve geri donen kullanici en basta buluyordu kendini.
     *
     * 2. Duz bir scroll dinleyicisi de yetmiyor. Ayni gecis sirasindaki
     *    programatik "tepeye al" da bir scroll olayi uretiyor ve 0 degeri
     *    hafizanin ustune yaziliyordu.
     *
     * Cozum: scroll olayi yalnizca yakin zamanda GERCEK bir kullanici hareketi
     * (tekerlek, dokunus, klavye, kaydirma cubugu) olduysa kaydedilir.
     * Uygulamanin ya da yonlendiricinin kendi kaydirmalari hafizayi bozamaz.
     */
    useEffect(() => {
        const container = document.querySelector("main");
        if (!container) return;

        let lastGestureAt = 0;
        const markGesture = () => {
            lastGestureAt = Date.now();
        };

        const GESTURE_WINDOW_MS = 1500;
        const gestureEvents = ["wheel", "touchmove", "keydown", "pointerdown"];
        gestureEvents.forEach((type) => container.addEventListener(type, markGesture, { passive: true }));

        const onScroll = () => {
            if (restoringRef.current) return;
            if (Date.now() - lastGestureAt > GESTURE_WINDOW_MS) return;
            if (feedMemory) feedMemory.scrollTopByTab[activeTabRef.current] = container.scrollTop;
        };

        container.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            gestureEvents.forEach((type) => container.removeEventListener(type, markGesture));
            container.removeEventListener("scroll", onScroll);
        };
    }, []);

    /**
     * Konum geri yuklemesi. HEM ilk mount'ta (detaydan geri donus) HEM de sekme
     * degisiminde calisir.
     *
     * Neden efekt, neden olay isleyicisi degil: isleyici React yeni sekmenin
     * icerigini DOM'a yazmadan ONCE calisiyor. O anda kap hala eski (ve genelde
     * daha kisa) icerikle duruyor, tarayici hedef konumu kirpiyor ve konum
     * kayboluyordu. Efekt icerik cizildikten sonra calisir.
     *
     * useLayoutEffect: boyamadan once konumlanir, boylece kullanici once en ustu
     * gorup sonra asagi ziplamaz.
     */
    useLayoutEffect(() => {
        const saved = feedMemory?.scrollTopByTab?.[activeTab];

        // Kayit YOKSA kullanici oldugu yerde kalir. Sekme cubugu yapiskan
        // oldugu icin baglam kaybolmaz: icerik degisir, konum degismez (X'in
        // davranisi). Eskiden burada varsayilan 0 kullaniliyordu ve hic
        // acilmamis bir sekmeye gecmek sayfayi en basa firlatiyordu.
        if (typeof saved !== "number") return;

        restoreScroll(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Açılışta önce varsayılan sekme (Keşfet), ardından diğerleri arka
    // planda; sekme değişince içerik anında hazır olur.
    //
    // TAB_ORDER üzerinden dönüyor: sekme listesine yeni bir giriş eklendiğinde
    // ön yüklemeye eklemeyi unutmak mümkün olmasın (eski "Hepsi" hatası tam
    // olarak buydu, elle yazılmış listede o sekme yoktu).
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        void (async () => {
            await loadTab("discover", true);
            for (const tab of TAB_ORDER) {
                if (cancelled) return;
                if (!feedsRef.current[tab].loaded) await loadTab(tab, true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, loadTab]);

    // Emniyet: ön yükleme başarısız olduysa sekmeye girildiğinde yükle.
    useEffect(() => {
        if (!isAuthenticated) return;
        const state = feedsRef.current[activeTab];
        if (!state.loaded && !state.loading) void loadTab(activeTab, true);
    }, [isAuthenticated, activeTab, loadTab]);

    const activeState = feeds[activeTab];

    // Sonsuz akış tetikleyicisi. Eskiden burada elle kurulan bir
    // IntersectionObserver vardı ve iki sorunu vardı: root olarak viewport
    // kullanıyordu (oysa sayfa <main> içinde kayıyor, dolayısıyla rootMargin
    // hiç işlemiyordu ve ön yükleme olmuyordu) ve her yüklemede söküp takıldığı
    // için tetikleyici olaylar kaybolabiliyordu. Hook doğru kabı bulup
    // scroll dinleyicisiyle de yedekliyor.
    const sentinelRef = useInfiniteScroll<HTMLDivElement>({
        enabled: isAuthenticated && activeState.hasMore && activeState.items.length > 0,
        loading: activeState.loading,
        onLoadMore: () => void loadTab(activeTab, false),
    });

    if (!isAuthenticated) {
        return (
            <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 px-6 py-16 text-center">
                <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                    <ActivityIcon className="h-10 w-10 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">{t("home.joinTitle")}</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("home.joinDescription")}</p>
                </div>
                <Link
                    href={buildLocalizedPathname("/login", locale)}
                    className="mx-auto flex h-10 w-fit items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {t("home.joinCta")}
                </Link>
            </div>
        );
    }

    // Filtreleme artik SUNUCUDA; burada aktif sekmenin kendi listesi gosterilir.
    const visibleActivities = activeState.items;
    // İlk yükleme (henüz hiç veri yok) ile "sonu geldi" durumunu ayırmak için:
    // ilkinde iskelet, ikincisinde boş durum metni gösterilmeli.
    const isInitialLoading = activeState.loading && visibleActivities.length === 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold tracking-tight">{t("home.activityTitle")}</h2>
                </div>
            </div>

            {/* Yeni gönderi "Gönderiler" sekmesine düşer (kendi akışın), Keşfet'e değil;
                o yüzden orayı tazeliyoruz. */}
            {/* Yanitlar akista gorunmez (sunucu WhereRootLevel() ile suzuyor);
                buradaki composer kok gonderi uretir, dolayisiyla kosul yok. */}
            <PostComposer onCreated={prependPost} />

            {/* Sekme sırası mobildeki TAB_ORDER ile birebir: discover, posts, reviews.
                KONTROLLÜ kullanılıyor (defaultValue DEĞİL): daha önce state "discover"
                ile başlarken Tabs'ın kendi defaultValue'su "posts" idi, iki ayrı
                doğruluk kaynağı birbirini tutmuyordu ve açılışta Keşfet yerine
                Gönderiler geliyordu. value={activeTab} ile kaynak tek. */}
            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    const next = value as TabKey;

                    // Eski sekmenin konumunu sakla, yeni sekmeninkini geri yukle.
                    // Sekme degisiminde kosulsuz en uste donmek, kullanicinin
                    // okudugu yeri her gecatiste kaybettiriyordu.
                    saveScroll(activeTab);

                    // Geri yukleme BURADA yapilmaz: bu isleyici React yeni
                    // sekmenin icerigini DOM'a yazmadan once calisiyor ve o anda
                    // kap hala eski icerikle duruyor, tarayici hedefi kirpiyor.
                    // Konumlanma activeTab'a bagli layout efektinde.
                    setActiveTab(next);
                }}
            >
                {/*
                    Yapışkan sekme çubuğu. Sayfa <body> üzerinde KAYMIYOR; kaydırma
                    kabı (authenticated) layout'undaki <main className="overflow-y-auto">,
                    dolayısıyla top-0 ona göre çözülüyor (yan menünün sticky top-4'ü de
                    zaten bu yüzden çalışıyor).

                    Sarmalayıcı şart: TabsList bg-muted ve köşeleri yuvarlak, doğrudan
                    sticky verilince altından kayan içerik köşelerden görünüyor.
                    Negatif margin + padding, kartların gölgesi kenardan kırpılmasın diye.
                */}
                <div className="sticky top-0 z-20 -mx-2 bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="discover" className="gap-1 text-xs">
                            <Compass className="h-3 w-3" /> {t("home.activityTabs.discover")}
                        </TabsTrigger>
                        <TabsTrigger value="posts" className="gap-1 text-xs">
                            <MessageSquare className="h-3 w-3" /> {t("home.activityTabs.posts")}
                        </TabsTrigger>
                        <TabsTrigger value="reviews" className="gap-1 text-xs">
                            <Star className="h-3 w-3" /> {t("home.activityTabs.reviews")}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="space-y-3">
                        {isInitialLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                        ) : visibleActivities.length > 0 ? (
                            visibleActivities.map((activity) => <FeedCard key={getActivityKey(activity)} activity={activity} locale={locale} />)
                        ) : (
                            <div className="py-12 text-center text-muted-foreground">
                                <ActivityIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                <p className="text-sm">{t("home.activityEmptyTitle")}</p>
                                <p className="mt-1 text-xs">{t("home.activityEmptyDescription")}</p>
                            </div>
                        )}

                        {activeState.loading && visibleActivities.length > 0 ? (
                            <div className="space-y-3">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                        ) : null}

                        {activeState.hasMore && visibleActivities.length > 0 ? (
                            <div ref={sentinelRef} className="flex h-10 items-center justify-center">
                                {activeState.loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                            </div>
                        ) : null}

                        {!activeState.hasMore && visibleActivities.length > 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground/70">{t("home.feedEnd")}</p>
                        ) : null}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FeedCard({ activity, locale }: { activity: Activity; locale: "tr" | "en-US" }) {
    const timeAgo = formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true, locale: locale === "tr" ? tr : enUS });

    switch (activity.type) {
        case ActivityType.Post:
        case ActivityType.Repost:
            // postData yoksa hiç çizme: sunucu her zaman dolduruyor ama eski bir
            // yanıt önbellekten gelirse kart boş referansla patlamasın.
            return activity.postData ? <PostCard post={activity.postData} /> : null;
        case ActivityType.Review:
            return <ReviewCard activity={activity} timeAgo={timeAgo} locale={locale} />;
        case ActivityType.ListCreated:
            return <ListCard activity={activity} timeAgo={timeAgo} locale={locale} />;
        case ActivityType.FollowUser:
            return <FollowCard activity={activity} timeAgo={timeAgo} locale={locale} />;
        default:
            // Bilinmeyen tip sessizce atlanır. Bu KASITLI: sunucu ileride yeni
            // bir kart tipi eklerse güncellenmemiş istemci çökmek yerine o kartı
            // görmez. Aynı gerekçeyle mağazadaki eski mobil sürümler ?type=
            // yolunu kullanıyor ve hiç Post/Repost almıyor.
            return null;
    }
}

/** Kart başlığı: aktör avatarı + kullanıcı adı + eylem + zaman. Aktör yoksa (eski API) ikon gösterilir. */
function CardHeader({
    actor,
    fallbackIcon,
    actionText,
    timeAgo,
    locale,
}: {
    actor: ActivityActor | null | undefined;
    fallbackIcon: React.ReactNode;
    actionText: string;
    timeAgo: string;
    locale: "tr" | "en-US";
}) {
    if (!actor) {
        return (
            <div className="flex items-start gap-3">
                {fallbackIcon}
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    <span className="text-sm font-semibold">{actionText}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Link href={buildLocalizedPathname(`/profiles/${actor.username}`, locale)} className="shrink-0">
                <Avatar className="h-9 w-9 border border-border transition-transform hover:scale-105">
                    <AvatarImage src={getImageUrl(actor.profileImageUrl) || ""} className="object-cover" />
                    <AvatarFallback className="text-xs">{actor.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <Link
                    href={buildLocalizedPathname(`/profiles/${actor.username}`, locale)}
                    className="max-w-[160px] truncate text-sm font-bold hover:text-primary hover:underline"
                >
                    {actor.username}
                </Link>
                <span className="text-sm text-muted-foreground">{actionText}</span>
                <span className="text-xs text-muted-foreground/70">· {timeAgo}</span>
            </div>
        </div>
    );
}

function ReviewCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const review = activity.reviewData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <CardHeader
                actor={activity.actor}
                fallbackIcon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <Star className="h-4 w-4 text-blue-500" />
                    </div>
                }
                actionText={text.home.reviewShared}
                timeAgo={timeAgo}
                locale={locale}
            />
            <Link
                href={buildLocalizedPathname(`/games/${review.game.slug}`, locale)}
                className="mt-3 flex items-start gap-3 rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
            >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md shadow-sm">
                    <Image src={getImageUrl(review.game.coverImage || review.game.backgroundImage) || placeholderGame.src} alt={review.game.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{review.game.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 rounded bg-yellow-500/10 px-1.5 py-0.5">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{review.rating}</span>
                        </div>
                    </div>
                    {review.contentSnippet ? (
                        // Kart komple tıklanabilir; mention yalnızca boyanır, link DEĞİL.
                        <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
                            &quot;
                            <MentionText text={review.contentSnippet} linkify={false} />
                            &quot;
                        </p>
                    ) : null}
                </div>
            </Link>
            <div className="mt-2.5 flex items-center gap-5 pl-1 text-muted-foreground">
                <span className="flex items-center gap-1.5 text-xs">
                    <Heart className="h-3.5 w-3.5" />
                    {review.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {review.commentCount ?? 0}
                </span>
            </div>
        </div>
    );
}

function ListCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const list = activity.listData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <CardHeader
                actor={activity.actor}
                fallbackIcon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                        <List className="h-4 w-4 text-amber-500" />
                    </div>
                }
                actionText={text.home.listCreated}
                timeAgo={timeAgo}
                locale={locale}
            />
            <Link
                href={buildLocalizedPathname(`/lists/${list.listId}`, locale)}
                className="group mt-3 block rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
            >
                <p className="text-sm font-bold transition-colors group-hover:text-primary">{list.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {list.gameCount} {text.home.gamesSuffix}
                </p>
                {list.previewImages.length > 0 ? (
                    <div className="mt-2 flex gap-1">
                        {list.previewImages.slice(0, 4).map((image, index) => (
                            <div key={index} className="relative h-12 w-9 overflow-hidden rounded-md bg-muted shadow-sm">
                                {image ? <Image src={getImageUrl(image) || ""} alt="Game" fill className="object-cover" /> : null}
                            </div>
                        ))}
                    </div>
                ) : null}
            </Link>
        </div>
    );
}

function FollowCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const follow = activity.followData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <CardHeader
                actor={activity.actor}
                fallbackIcon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <UserPlus className="h-4 w-4 text-emerald-500" />
                    </div>
                }
                actionText={text.home.startedFollowing}
                timeAgo={timeAgo}
                locale={locale}
            />
            <Link
                href={buildLocalizedPathname(`/profiles/${follow.username}`, locale)}
                className="mt-3 flex items-center gap-3 rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
            >
                <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={getImageUrl(follow.profileImageUrl) || ""} className="object-cover" />
                    <AvatarFallback className="text-xs">{follow.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-semibold">{follow.username}</p>
                    <p className="text-xs text-muted-foreground">{text.home.viewProfile}</p>
                </div>
            </Link>
        </div>
    );
}

function getActivityKey(activity: Activity) {
    switch (activity.type) {
        case ActivityType.Review:
            return `review-${activity.reviewData?.reviewId ?? activity.id}-${activity.occurredAt}`;
        case ActivityType.ListCreated:
            return `list-${activity.listData?.listId ?? activity.id}-${activity.occurredAt}`;
        case ActivityType.FollowUser:
            return `follow-${activity.actor?.username ?? ""}-${activity.followData?.username?.trim() || "unknown"}-${activity.occurredAt}`;
        default:
            return `activity-${activity.type}-${activity.id}-${activity.occurredAt}`;
    }
}
