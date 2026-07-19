"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { gameApi } from "@/api/gaming/game.api";
import { HomeGame } from "@/models/home/home.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import { buildLocalizedPathname } from "@/i18n/config";
import { Button } from "@/core/components/ui/button";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/core/components/ui/carousel";
import { PlatformIcons } from "@/core/components/other/platform-icons";
import { StoreButtons } from "@/core/components/other/public/store-buttons";
import logoSrc from "@core/assets/logo.png";
import metacriticLogoSrc from "@core/assets/metacritic_logo.png";
import rawgLogoSrc from "@core/assets/rawg_logo.png";

interface HeroSliderProps {
    games: HomeGame[];
}

const AUTOPLAY_DELAY = 6000;

const normalizeDescription = (value: string | null | undefined) => {
    if (!value) return null;

    const plainText = value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    return plainText || null;
};

function ScoreBadge({ score, logo, logoAlt, accentClassName }: { score: string; logo: typeof logoSrc; logoAlt: string; accentClassName: string }) {
    return (
        <div
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 py-1 pl-1.5 pr-2.5 backdrop-blur-md"
            title={logoAlt}
        >
            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-black/60 ring-1 ring-white/10">
                <Image src={logo} alt={logoAlt} width={12} height={12} className="object-contain" />
            </span>
            <span className={`text-sm font-bold leading-none ${accentClassName}`}>{score}</span>
        </div>
    );
}

export default function HeroSlider({ games = [] }: HeroSliderProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const [api, setApi] = useState<CarouselApi>();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    // Hover'dan çıkınca autoplay tam süreden yeniden başlar; progress barı da aynı anda sıfırlıyoruz.
    const [progressCycle, setProgressCycle] = useState(0);
    const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});

    const slideCount = games.length + 1;

    useEffect(() => {
        if (!api) return;
        const onSelect = () => {
            setSelectedIndex(api.selectedScrollSnap());
            setProgressCycle((cycle) => cycle + 1);
        };
        onSelect();
        api.on("select", onSelect);
        return () => {
            api.off("select", onSelect);
        };
    }, [api]);

    // Autoplay: plugin yerine deterministik zamanlayıcı. Hover'da durur,
    // her slayt değişiminde (manuel dahil) tam süreden yeniden başlar.
    useEffect(() => {
        if (!api || isHovering) return;
        const timer = setInterval(() => api.scrollNext(), AUTOPLAY_DELAY);
        return () => clearInterval(timer);
    }, [api, isHovering, selectedIndex, progressCycle]);

    useEffect(() => {
        let cancelled = false;

        const gamesNeedingDescription = games.filter((game) => {
            const key = `${locale}:${game.id || game.rawgId}`;
            return !normalizeDescription(game.description) && !descriptionOverrides[key];
        });

        if (gamesNeedingDescription.length === 0) {
            return;
        }

        const fillMissingDescriptions = async () => {
            const resolvedEntries = await Promise.all(
                gamesNeedingDescription.map(async (game) => {
                    try {
                        const detail = await gameApi.getById(game.slug || String(game.rawgId));
                        const localizedDescription = locale === "tr"
                            ? normalizeDescription(detail.descriptionTr)
                            : normalizeDescription(detail.description);

                        return localizedDescription
                            ? [`${locale}:${game.id || game.rawgId}`, localizedDescription] as const
                            : null;
                    } catch {
                        return null;
                    }
                }),
            );

            if (cancelled) {
                return;
            }

            const nextOverrides = resolvedEntries.reduce<Record<string, string>>((accumulator, entry) => {
                if (!entry) {
                    return accumulator;
                }

                accumulator[entry[0]] = entry[1];
                return accumulator;
            }, {});

            if (Object.keys(nextOverrides).length > 0) {
                setDescriptionOverrides((current) => ({ ...current, ...nextOverrides }));
            }
        };

        void fillMissingDescriptions();

        return () => {
            cancelled = true;
        };
    }, [games, locale, descriptionOverrides]);

    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
        setProgressCycle((cycle) => cycle + 1);
    }, []);

    return (
        <div className="group/hero relative w-full">
            <Carousel
                setApi={setApi}
                opts={{ loop: true }}
                className="w-full"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <CarouselContent>
                    {/* Sabit tanıtım slaytı: canlı mobil uygulama CTA'sı her zaman ilk sırada. */}
                    <CarouselItem key="app-promo">
                        <div className="relative h-[340px] w-full overflow-hidden rounded-2xl bg-[#080910] ring-1 ring-white/10 md:h-[420px]">
                            <div className="absolute inset-0 z-0 bg-gradient-to-br from-cyan-500/20 via-[#080910] to-violet-600/25" />
                            <div
                                aria-hidden
                                className="absolute inset-0 z-0 opacity-[0.35]"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
                                    backgroundSize: "56px 56px",
                                    maskImage: "radial-gradient(ellipse 90% 70% at 30% 40%, black 30%, transparent 75%)",
                                }}
                            />
                            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 z-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
                            <div aria-hidden className="pointer-events-none absolute -bottom-28 right-1/4 z-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

                            {/* Mobilde slayt sabit 340px: dolgu ve boşluklar dar tutulmazsa
                                içerik taşıp overflow-hidden tarafından kırpılıyor. md: ve
                                üstünde eski ferah düzen aynen korunuyor. */}
                            <div className="relative z-10 flex h-full max-w-[620px] flex-col items-center justify-center gap-2.5 px-4 pb-12 pt-5 text-center md:max-w-[58%] md:items-start md:gap-4 md:p-12 md:pb-16 md:text-left lg:px-16">
                                <Image
                                    src={logoSrc}
                                    alt={t("common.appName")}
                                    width={150}
                                    height={42}
                                    priority
                                    className="h-7 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] md:h-9"
                                />
                                <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-xl md:text-3xl lg:text-[2.6rem] lg:leading-[1.05]">{t("home.promoTitle")}</h2>
                                <p className="line-clamp-2 max-w-md text-sm text-white/65 md:line-clamp-none md:text-base">{t("home.promoSubtitle")}</p>
                                <div className="w-full pt-1 sm:max-w-sm md:pt-2">
                                    {/* Butonlar dar ekranda da yan yana: alt alta dizilmeleri
                                        slaytın sabit yüksekliğinde ~58px yiyip taşmaya yol açıyordu. */}
                                    <StoreButtons
                                        appStoreLabel={t("common.appStore")}
                                        googlePlayLabel={t("common.googlePlay")}
                                        soonText={t("common.soon")}
                                        className="flex-row gap-2 sm:gap-3"
                                    />
                                </div>
                            </div>

                            {/* Sağ alttan taşan iPhone mockup; hover'da doğrulur */}
                            <div className="absolute right-4 top-10 z-10 hidden w-[190px] md:block lg:right-16 lg:top-12 lg:w-[270px]">
                                <div className="rotate-[5deg] transition-transform duration-500 ease-out will-change-transform hover:-translate-y-3 hover:rotate-0">
                                    <div className="relative rounded-[2.4rem] bg-zinc-900 p-[7px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
                                        <div className="absolute left-1/2 top-[11px] z-20 h-[15px] w-[66px] -translate-x-1/2 rounded-full bg-black" />
                                        <div className="overflow-hidden rounded-[1.9rem] bg-black">
                                            <Image
                                                src={locale === "tr" ? "/gghub-app-tr.jpg" : "/gghub-app-en.jpg"}
                                                alt={t("common.appName")}
                                                width={540}
                                                height={1174}
                                                className="block h-auto w-full"
                                                sizes="270px"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CarouselItem>

                    {games.map((game, index) => {
                        const descriptionKey = `${locale}:${game.id || game.rawgId}`;
                        const resolvedDescription = normalizeDescription(game.description) ?? descriptionOverrides[descriptionKey] ?? null;
                        const isActive = selectedIndex === index + 1;
                        const releaseYear = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;

                        return (
                            <CarouselItem key={game.id}>
                                <div className="relative h-[340px] w-full overflow-hidden rounded-2xl bg-[#080910] ring-1 ring-white/10 md:h-[420px]">
                                    {/* Tam kanlı keskin görsel + sinematik zoom */}
                                    <div className="absolute inset-0 z-0 overflow-hidden">
                                        <Image
                                            src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                                            alt={game.name}
                                            fill
                                            className={`object-cover ${isActive ? "hero-kenburns" : "scale-[1.02]"}`}
                                            priority={index === 0}
                                            sizes="(max-width: 1600px) 100vw, 1600px"
                                        />
                                        {/* Katmanlı karartma: alt ağırlıklı + sol vurgulu, metin her görselde okunur */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#080910] via-[#080910]/45 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#080910]/85 via-[#080910]/30 to-transparent" />
                                    </div>

                                    {/* Sinematik alt-sol içerik bloğu */}
                                    <div className="relative z-10 flex h-full flex-col justify-end p-6 pb-14 md:p-12 md:pb-16 lg:px-16">
                                        <div className="flex max-w-2xl flex-col items-start gap-3.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {game.metacriticScore != null && game.metacriticScore > 0 ? (
                                                    <ScoreBadge score={String(game.metacriticScore)} logo={metacriticLogoSrc} logoAlt="Metacritic" accentClassName="text-green-400" />
                                                ) : null}
                                                {game.rawgRating != null && game.rawgRating > 0 ? (
                                                    <ScoreBadge score={game.rawgRating.toFixed(1)} logo={rawgLogoSrc} logoAlt="RAWG" accentClassName="text-sky-400" />
                                                ) : null}
                                                {game.gghubRating > 0 ? (
                                                    <ScoreBadge score={game.gghubRating.toFixed(1)} logo={logoSrc} logoAlt="GGHub" accentClassName="text-violet-400" />
                                                ) : null}

                                                <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-xs font-medium text-white/70 backdrop-blur-md">
                                                    {releaseYear ?? t("common.tba")}
                                                </span>

                                                {game.platforms && game.platforms.length > 0 ? (
                                                    <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 backdrop-blur-md">
                                                        <PlatformIcons platforms={game.platforms} />
                                                    </span>
                                                ) : null}
                                            </div>

                                            <h2 className="line-clamp-2 text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)] md:text-4xl lg:text-5xl">
                                                {game.name}
                                            </h2>

                                            {resolvedDescription ? (
                                                <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-white/60 md:text-sm">{resolvedDescription}</p>
                                            ) : null}

                                            <div className="pt-1.5">
                                                <Link href={buildLocalizedPathname(`/games/${game.slug || game.rawgId}`, locale)}>
                                                    <Button size="lg" className="text-md cursor-pointer gap-2 font-semibold shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.03]">
                                                        <Play className="h-4 w-4 fill-current" />
                                                        {t("home.heroCta")}
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slayt sayacı */}
                                    <div className="absolute right-5 top-5 z-10 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[11px] tracking-widest text-white/60 backdrop-blur-md md:right-8 md:top-6">
                                        {String(index + 2).padStart(2, "0")}&thinsp;/&thinsp;{String(slideCount).padStart(2, "0")}
                                    </div>
                                </div>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>

                {/* Segmentli ilerleme göstergeleri: aktif segment autoplay ile dolar, tıklanınca slayta gider */}
                <div className="absolute bottom-5 left-6 z-20 flex items-center gap-1.5 md:left-12 lg:left-16">
                    {Array.from({ length: slideCount }).map((_, index) => {
                        const isActive = selectedIndex === index;
                        return (
                            <button
                                key={index}
                                type="button"
                                aria-label={`Slide ${index + 1}`}
                                aria-current={isActive}
                                onClick={() => api?.scrollTo(index)}
                                className={`h-1 cursor-pointer overflow-hidden rounded-full transition-all duration-400 ${
                                    isActive ? "w-10 bg-white/20" : "w-4 bg-white/15 hover:bg-white/30"
                                }`}
                            >
                                {isActive ? (
                                    <span key={`${selectedIndex}-${progressCycle}`} className="hero-progress-fill block h-full w-full rounded-full bg-white/90" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>

                {/* Oklar: hover'da görünen minimal cam butonlar */}
                <div className="absolute bottom-4 right-5 z-20 flex gap-2 opacity-0 transition-opacity duration-300 group-hover/hero:opacity-100 md:right-8">
                    <button
                        type="button"
                        aria-label="Previous slide"
                        onClick={() => api?.scrollPrev()}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next slide"
                        onClick={() => api?.scrollNext()}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </Carousel>
        </div>
    );
}
