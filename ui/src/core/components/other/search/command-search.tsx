"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/api/search/search.api";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import { buildLocalizedPathname } from "@/i18n/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/core/components/ui/command";

interface CommandSearchProps {
    variant?: "default" | "sidebar";
    collapsed?: boolean;
}

export function CommandSearch({ variant = "default", collapsed = false }: CommandSearchProps) {
    const locale = useCurrentLocale();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const { data: results, isLoading } = useQuery({
        queryKey: ["search", query, locale],
        queryFn: () => searchAll(query),
        enabled: query.length >= 3,
        staleTime: 30000,
    });

    const localizeHref = useCallback(
        (href: string) => (href.startsWith("/") ? buildLocalizedPathname(href, locale) : href),
        [locale]
    );

    const handleSelect = (link: string) => {
        setOpen(false);
        setQuery("");
        router.push(localizeHref(link));
    };

    const users = results?.filter((r) => r.type === "Kullanıcı") ?? [];
    const games = results?.filter((r) => r.type === "Oyun") ?? [];

    const placeholder = locale === "tr" ? "Oyun, kullanıcı veya liste ara..." : "Search games, users, or lists...";
    const noResults = locale === "tr" ? "Sonuç bulunamadı." : "No results found.";

    const shortPlaceholder = locale === "tr" ? "Ara..." : "Search...";

    return (
        <>
            {variant === "sidebar" ? (
                /* Sidebar trigger - matches nav item sizing exactly */
                <button
                    onClick={() => setOpen(true)}
                    className={`flex w-full cursor-pointer items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground py-2.5 ${
                        collapsed ? "justify-center px-2" : "gap-3 px-3"
                    }`}
                >
                    <Search className="h-[1.15rem] w-[1.15rem] shrink-0" />
                    {!collapsed && <span className="sidebar-label truncate text-sm font-medium">{shortPlaceholder}</span>}
                </button>
            ) : (
                <>
                    {/* Desktop trigger pill */}
                    <button
                        onClick={() => setOpen(true)}
                        className="hidden cursor-pointer items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden lg:inline">{placeholder}</span>
                        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
                            <span className="text-xs">Ctrl</span>K
                        </kbd>
                    </button>

                    {/* Mobile trigger */}
                    <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer md:hidden" onClick={() => setOpen(true)}>
                        <Search className="h-5 w-5" />
                    </Button>
                </>
            )}

            {/* Command palette dialog */}
            <CommandDialog
                open={open}
                onOpenChange={(v) => {
                    setOpen(v);
                    if (!v) setQuery("");
                }}
                title={locale === "tr" ? "Ara" : "Search"}
                description={placeholder}
                showCloseButton={false}
            >
                <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
                <CommandList>
                    {query.length >= 3 && !isLoading && users.length === 0 && games.length === 0 ? (
                        <CommandEmpty>{noResults}</CommandEmpty>
                    ) : null}

                    {query.length < 3 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            {locale === "tr" ? "Aramak için en az 3 karakter girin..." : "Type at least 3 characters to search..."}
                        </div>
                    ) : null}

                    {isLoading && query.length >= 3 ? (
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
                                    <Avatar className="h-8 w-8 rounded-md">
                                        {result.imageUrl ? <AvatarImage src={result.imageUrl} alt={result.title} /> : null}
                                        <AvatarFallback className="rounded-md">{result.title.charAt(0)}</AvatarFallback>
                                    </Avatar>
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
