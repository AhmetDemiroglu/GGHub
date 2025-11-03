"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader } from "lucide-react";
import { Input } from "@/core/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { useRouter } from "next/navigation";
import { searchAll } from "@/api/search/search.api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function SearchBar() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);

    const { data: results, isLoading } = useQuery({
        queryKey: ["search", query],
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

    const getImageUrl = (path: string | null | undefined): string | undefined => {
        if (!path) {
            return undefined;
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-lg lg:max-w-2xl">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Oyun, kullanıcı veya liste ara..."
                    className="pl-8"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => query.length >= 3 && setIsOpen(true)}
                />
                {isLoading && <Loader className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {isOpen && query.length >= 3 && (
                <div className="absolute top-full mt-2 w-full rounded-md border bg-popover shadow-lg z-50">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Aranıyor...</div>
                    ) : results && results.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                            {results.filter((r) => r.type === "Kullanıcı").length > 0 && (
                                <>
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">Kullanıcılar</div>
                                    {results
                                        .filter((r) => r.type === "Kullanıcı")
                                        .map((result) => (
                                            <Link
                                                key={`${result.type}-${result.id}`}
                                                href={result.link}
                                                className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery("");
                                                }}
                                            >
                                                {result.imageUrl && (
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={getImageUrl(result.imageUrl)} alt={result.title} />
                                                        <AvatarFallback>{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{result.title}</p>
                                                    <p className="text-xs text-muted-foreground">@{result.id}</p>
                                                </div>
                                            </Link>
                                        ))}
                                </>
                            )}

                            {results.filter((r) => r.type === "Oyun").length > 0 && (
                                <>
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">Oyunlar</div>
                                    {results
                                        .filter((r) => r.type === "Oyun")
                                        .slice(0, 5)
                                        .map((result) => (
                                            <Link
                                                key={`${result.type}-${result.id}`}
                                                href={result.link}
                                                className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setQuery("");
                                                }}
                                            >
                                                <Avatar className="h-10 w-10 rounded-md">
                                                    {result.imageUrl ? <AvatarImage src={result.imageUrl} alt={result.title} /> : null}
                                                    <AvatarFallback className="rounded-md">{result.title.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{result.title}</p>
                                                    <p className="text-xs text-muted-foreground">Oyun</p>
                                                </div>
                                            </Link>
                                        ))}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">Sonuç bulunamadı</div>
                    )}
                </div>
            )}
        </div>
    );
}
