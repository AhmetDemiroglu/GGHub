"use client";

import { useEffect, useState } from "react";
import { trackAction } from "@/core/lib/site-analytics";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/api/search/search.api";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { useDebounce } from "@/core/hooks/use-debounce";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/core/components/ui/command";

interface CommandSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Arama paletinin kendisi (cmdk + Radix Dialog + sorgu). CommandSearch bunu next/dynamic ile
 * yalniz palet ACILINCA indirir: kenar cubugu her sayfada oldugu icin bu kod her sayfanin ilk
 * yukune giriyordu (~30 kB gz), oysa ziyaretlerin cogunda arama hic acilmiyor.
 * Kapaninca bilesen sokulur; sorgu state'i de onunla sifirlanir.
 */
export default function CommandSearchDialog({ open, onOpenChange }: CommandSearchDialogProps) {
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();
    const router = useRouter();
    const [query, setQuery] = useState("");

    // Debounce: her tuş vuruşunda istek atılmasın; kullanıcı duraksayınca tek istek gitsin.
    const debouncedQuery = useDebounce(query, 300);

    // Her tus vurusu degil, kullanicinin durakladigi (istek atilan) arama sayilir.
    useEffect(() => {
        if (debouncedQuery.length >= 3) trackAction("search");
    }, [debouncedQuery]);

    const { data: results, isLoading, isError } = useQuery({
        queryKey: ["search", debouncedQuery, locale],
        queryFn: () => searchAll(debouncedQuery),
        enabled: debouncedQuery.length >= 3,
        staleTime: 30000,
        meta: { suppressGlobalToast: true },
    });

    // Debounce beklerken veya istek uçarken "Sonuç bulunamadı." göstermemek için tek bayrak.
    const isSearching = query.length >= 3 && (isLoading || debouncedQuery !== query);

    const handleSelect = (link: string) => {
        onOpenChange(false);
        setQuery("");
        router.push(localizeHref(link));
    };

    const users = results?.filter((r) => r.type === "Kullanıcı") ?? [];
    const games = results?.filter((r) => r.type === "Oyun") ?? [];

    const placeholder = locale === "tr" ? "Oyun, kullanıcı veya liste ara..." : "Search games, users, or lists...";
    const noResults = locale === "tr" ? "Sonuç bulunamadı." : "No results found.";

    return (
        <>
            {/* Command palette dialog */}
            <CommandDialog
                open={open}
                onOpenChange={(v) => {
                    onOpenChange(v);
                    if (!v) setQuery("");
                }}
                title={locale === "tr" ? "Ara" : "Search"}
                description={placeholder}
                showCloseButton={false}
            >
                <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
                <CommandList>
                    {query.length >= 3 && !isSearching && isError ? (
                        <CommandEmpty>
                            {locale === "tr" ? "Arama şu anda kullanılamıyor. Lütfen tekrar deneyin." : "Search is temporarily unavailable. Please try again."}
                        </CommandEmpty>
                    ) : null}

                    {query.length >= 3 && !isSearching && !isError && users.length === 0 && games.length === 0 ? (
                        <CommandEmpty>{noResults}</CommandEmpty>
                    ) : null}

                    {query.length < 3 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            {locale === "tr" ? "Aramak için en az 3 karakter girin..." : "Type at least 3 characters to search..."}
                        </div>
                    ) : null}

                    {isSearching ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            {locale === "tr" ? "Aranıyor..." : "Searching..."}
                        </div>
                    ) : null}

                    {users.length > 0 ? (
                        <CommandGroup heading={locale === "tr" ? "Kullanıcılar" : "Users"}>
                            {users.map((result) => (
                                <CommandItem key={`user-${result.id}`} onSelect={() => handleSelect(result.link)} className="cursor-pointer gap-3 py-2.5">
                                    {result.imageUrl ? (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={getImageUrl(result.imageUrl)} alt={result.title} />
                                            <AvatarFallback>{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{result.title}</p>
                                        <p className="text-xs text-muted-foreground">@{result.id}</p>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ) : null}

                    {games.length > 0 ? (
                        <CommandGroup heading={locale === "tr" ? "Oyunlar" : "Games"}>
                            {games.slice(0, 5).map((result) => (
                                <CommandItem key={`game-${result.id}`} onSelect={() => handleSelect(result.link)} className="cursor-pointer gap-3 py-2.5">
                                    {/* Oyun kapakları 16:9; Radix Avatar bunları kare kutuda
                                        güvenilir yükleyemiyordu (baş harf fallback'te kalıyordu).
                                        Doğrudan img: hem doğru en boy oranı hem kesin yükleme. */}
                                    {result.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={result.imageUrl}
                                            alt={result.title}
                                            className="h-8 w-12 shrink-0 rounded-md object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                                            {result.title.charAt(0)}
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{result.title}</p>
                                        <p className="text-xs text-muted-foreground">{locale === "tr" ? "Oyun" : "Game"}</p>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ) : null}
                </CommandList>
            </CommandDialog>
        </>
    );
}
