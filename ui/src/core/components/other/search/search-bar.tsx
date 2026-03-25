"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/api/search/search.api";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import { buildLocalizedPathname } from "@/i18n/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Input } from "@/core/components/ui/input";

export function SearchBar() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const { data: results, isLoading } = useQuery({
        queryKey: ["search", query, locale],
        queryFn: () => searchAll(query),
        enabled: query.length >= 3,
        staleTime: 30000,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const localizeHref = (href: string) => (href.startsWith("/") ? buildLocalizedPathname(href, locale) : href);

    return (
        <div ref={searchRef} className="relative w-full max-w-lg lg:max-w-2xl">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={locale === "tr" ? "Oyun, kullanıcı veya liste ara..." : "Search games, users, or lists..."}
                    className="pl-8"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => query.length >= 3 && setIsOpen(true)}
                />
                {isLoading ? <Loader className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>

            {isOpen && query.length >= 3 ? (
                <div className="absolute top-full z-50 mt-2 w-full rounded-md border bg-popover shadow-lg">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">{locale === "tr" ? "Aranıyor..." : "Searching..."}</div>
                    ) : results && results.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                            {results.filter((result) => result.type === "Kullanıcı").length > 0 ? (
                                <>
                                    <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">{locale === "tr" ? "Kullanıcılar" : "Users"}</div>
                                    {results
                                        .filter((result) => result.type === "Kullanıcı")
                                        .map((result) => (
                                            <Link
                                                key={`${result.type}-${result.id}`}
                                                href={localizeHref(result.link)}
                                                className="flex cursor-pointer items-center gap-3 border-b p-3 hover:bg-accent"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery("");
                                                }}
                                            >
                                                {result.imageUrl ? (
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={getImageUrl(result.imageUrl)} alt={result.title} />
                                                        <AvatarFallback>{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                ) : null}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{result.title}</p>
                                                    <p className="text-xs text-muted-foreground">@{result.id}</p>
                                                </div>
                                            </Link>
                                        ))}
                                </>
                            ) : null}

                            {results.filter((result) => result.type === "Oyun").length > 0 ? (
                                <>
                                    <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">{locale === "tr" ? "Oyunlar" : "Games"}</div>
                                    {results
                                        .filter((result) => result.type === "Oyun")
                                        .slice(0, 5)
                                        .map((result) => (
                                            <Link
                                                key={`${result.type}-${result.id}`}
                                                href={localizeHref(result.link)}
                                                className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0 hover:bg-accent"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery("");
                                                }}
                                            >
                                                <Avatar className="h-10 w-10 rounded-md">
                                                    {result.imageUrl ? <AvatarImage src={result.imageUrl} alt={result.title} /> : null}
                                                    <AvatarFallback className="rounded-md">{result.title.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{result.title}</p>
                                                    <p className="text-xs text-muted-foreground">{locale === "tr" ? "Oyun" : "Game"}</p>
                                                </div>
                                            </Link>
                                        ))}
                                </>
                            ) : null}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">{t("common.noResults")}</div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
