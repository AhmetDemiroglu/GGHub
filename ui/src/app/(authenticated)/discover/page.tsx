"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { gameApi } from "@/api/gaming/game.api";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useDebounce } from "@core/hooks/use-debounce";
import { DateFilter } from "@core/components/other/date-filter";
import { DataPagination } from "@core/components/other/data-pagination";
import { GameCard } from "@core/components/other/game-card";
import { GameCardSkeleton } from "@core/components/other/game-card/skeleton";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@core/components/ui/select";

function DiscoverPageContent() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize")) || 12);
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    // "__default__" sentinel = önerilen (backend default kalite+rotasyon).
    // URL'de "ordering" parametresi yoksa "__default__" kullan; API'ye undefined gönderilir.
    const [ordering, setOrdering] = useState(searchParams.get("ordering") || "__default__");
    const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genres") || "");
    const [selectedPlatform, setSelectedPlatform] = useState(searchParams.get("platforms") || "");
    const [dateRange, setDateRange] = useState(searchParams.get("dates") || "");
    const [isGenreMenuOpen, setGenreMenuOpen] = useState(false);
    const [isPlatformMenuOpen, setPlatformMenuOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Genre options: numeric RAWG ID olarak gönderilir; backend slug'a normalize eder
    const genreOptions = [
        { value: "4",  label: t("discover.genres.action") },
        { value: "51", label: t("discover.genres.indie") },
        { value: "3",  label: t("discover.genres.adventure") },
        { value: "5",  label: t("discover.genres.rpg") },
        { value: "10", label: t("discover.genres.strategy") },
        { value: "2",  label: t("discover.genres.shooter") },
        { value: "7",  label: t("discover.genres.puzzle") },
        { value: "11", label: t("discover.genres.arcade") },
        { value: "83", label: t("discover.genres.platformer") },
        { value: "1",  label: t("discover.genres.racing") },
        { value: "59", label: t("discover.genres.massivelyMultiplayer") },
        { value: "15", label: t("discover.genres.sports") },
        { value: "6",  label: t("discover.genres.fighting") },
        { value: "14", label: t("discover.genres.simulation") },
    ];

    const platformOptions = [
        { value: "4",   label: "PC" },
        { value: "187", label: "PlayStation 5" },
        { value: "18",  label: "PlayStation 4" },
        { value: "186", label: "Xbox Series X" },
        { value: "1",   label: "Xbox One" },
        { value: "7",   label: "Nintendo Switch" },
        { value: "3",   label: "iOS" },
        { value: "21",  label: "Android" },
        { value: "5",   label: "macOS" },
        { value: "6",   label: "Linux" },
    ];

    const orderingOptions = [
        { value: "__default__", label: t("discover.ordering.relevance") },
        { value: "-added",      label: t("discover.ordering.popularity") },
        { value: "-metacritic", label: t("discover.ordering.metacritic") },
        { value: "-released",   label: t("discover.ordering.releaseDate") },
        { value: "name",        label: t("discover.ordering.gameName") },
    ];

    const { data, isLoading, error } = useQuery({
        queryKey: ["games-discover", searchParams.toString(), locale],
        queryFn: () =>
            gameApi.discover({
                page:      Number(searchParams.get("page")) || 1,
                pageSize:  Number(searchParams.get("pageSize")) || 12,
                search:    searchParams.get("search") || undefined,
                // "__default__" URL'de bulunmaz; boş ise backend default (kalite+rotasyon) uygular
                ordering:  searchParams.get("ordering") || undefined,
                genres:    searchParams.get("genres") || undefined,
                platforms: searchParams.get("platforms") || undefined,
                dates:     searchParams.get("dates") || undefined,
            }),
        placeholderData: (previousData) => previousData,
    });

    // Filtre değişince sayfayı sıfırla
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, ordering, selectedGenre, selectedPlatform, dateRange]);

    // Sayfaya scroll — yeni veri gelince başa dön
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [data]);

    // URL'yi state ile senkronize tut
    useEffect(() => {
        const params = new URLSearchParams();

        if (page !== 1) params.set("page", String(page));
        if (pageSize !== 12) params.set("pageSize", String(pageSize));
        if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
        if (selectedGenre) params.set("genres", selectedGenre);
        if (selectedPlatform) params.set("platforms", selectedPlatform);
        if (dateRange) params.set("dates", dateRange);
        // "__default__" URL'e yazılmaz; backend parametresiz gelen isteği default feed olarak işler
        if (ordering && ordering !== "__default__") params.set("ordering", ordering);

        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [page, pageSize, debouncedSearchTerm, ordering, selectedGenre, selectedPlatform, dateRange, pathname, router]);

    if (error) {
        return <div>{t("discover.error", { message: error.message })}</div>;
    }

    const items = data?.items ?? [];

    return (
        <div className="h-full w-full p-5">
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-bold">{t("discover.title")}</h1>
                    <p className="mt-2 text-muted-foreground">{t("discover.description")}</p>
                </div>

                <div className="mb-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <Input placeholder={t("discover.searchPlaceholder")} className="w-full sm:max-w-xs" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />

                    <div className="flex flex-wrap items-center gap-2">
                        <Select open={isGenreMenuOpen} onOpenChange={setGenreMenuOpen} value={selectedGenre || ""} onValueChange={setSelectedGenre}>
                            <SelectTrigger className="w-full cursor-pointer sm:w-auto">
                                <SelectValue placeholder={t("discover.genrePlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <div
                                    onClick={() => {
                                        setSelectedGenre("");
                                        setGenreMenuOpen(false);
                                    }}
                                    className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-red-500 outline-none focus:bg-accent"
                                >
                                    {t("common.clear")}
                                </div>
                                <SelectSeparator />
                                {genreOptions.map((genre) => (
                                    <SelectItem key={genre.value} value={genre.value}>
                                        {genre.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select open={isPlatformMenuOpen} onOpenChange={setPlatformMenuOpen} value={selectedPlatform || ""} onValueChange={setSelectedPlatform}>
                            <SelectTrigger className="w-full cursor-pointer sm:w-auto">
                                <SelectValue placeholder={t("discover.platformPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <div
                                    onClick={() => {
                                        setSelectedPlatform("");
                                        setPlatformMenuOpen(false);
                                    }}
                                    className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-red-500 outline-none focus:bg-accent"
                                >
                                    {t("common.clear")}
                                </div>
                                <SelectSeparator />
                                {platformOptions.map((platform) => (
                                    <SelectItem key={platform.value} value={platform.value}>
                                        {platform.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DateFilter value={dateRange} onValueChange={setDateRange} />

                        <Select value={ordering} onValueChange={setOrdering}>
                            <SelectTrigger className="w-full cursor-pointer sm:w-auto">
                                <span className="text-sm">
                                    {orderingOptions.find((o) => o.value === ordering)?.label || t("discover.orderingPlaceholder")}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>{t("discover.orderingLabel")}</SelectLabel>
                                    <SelectSeparator />
                                    {orderingOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: pageSize }).map((_, index) => (
                        <GameCardSkeleton key={index} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">{t("discover.noGames")}</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((game) => (
                        <GameCard key={game.rawgId} game={game} />
                    ))}
                </div>
            )}

            {data && data.totalCount > 0 ? (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="order-1 text-center text-sm text-muted-foreground sm:text-left">
                        {t("discover.totalGames", { totalCount: data.totalCount, shownCount: items.length })}
                    </div>
                    <div className="order-3 sm:order-2">
                        <DataPagination page={page} pageSize={pageSize} totalCount={data.totalCount} onPageChange={setPage} />
                    </div>
                    <div className="order-2 flex items-center gap-2 sm:order-3">
                        <p className="whitespace-nowrap text-sm text-muted-foreground">{t("discover.perPage")}</p>
                        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                            <SelectTrigger className="w-20 cursor-pointer">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[12, 24, 40].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function DiscoverPage() {
    const t = useI18n();

    return (
        <Suspense fallback={<div>{t("common.loading")}</div>}>
            <DiscoverPageContent />
        </Suspense>
    );
}
