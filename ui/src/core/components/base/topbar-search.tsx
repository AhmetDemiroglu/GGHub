"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { searchAll } from "@/api/search/search.api";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useDebounce } from "@/core/hooks/use-debounce";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { getImageUrl } from "@/core/lib/get-image-url";
import { trackAction } from "@/core/lib/site-analytics";
import { cn } from "@/core/lib/utils";
import type { SearchResult } from "@/models/search/search.model";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";

const MIN_CHARS = 2;

/** Yazilabilir bir alan odaktayken "/" kisayolu calismaz; kullanicinin metnini bolmeyiz. */
function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

interface TopbarSearchProps {
    /** Mobilde cubuk arama moduna girer; kapatma dugmesi bunu cagirir. */
    onClose?: () => void;
    autoFocus?: boolean;
    className?: string;
}

/**
 * Ust cubuktaki arama. Sonuclar ayri bir pencere degil, girdinin hemen altinda acilan
 * bir liste: yazarken gelir, klavyeyle gezilir (ok tuslari, Enter, Esc). Kisayollar:
 * Ctrl/Cmd+K ve "/" girdiye odaklanir.
 */
export function TopbarSearch({ onClose, autoFocus = false, className }: TopbarSearchProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [isMac, setIsMac] = useState(false);
    const listId = useId();

    const debouncedQuery = useDebounce(query.trim(), 300);
    const ready = debouncedQuery.length >= MIN_CHARS;

    useEffect(() => {
        setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    }, []);

    useEffect(() => {
        if (ready) trackAction("search");
    }, [ready, debouncedQuery]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["search", debouncedQuery, locale],
        queryFn: () => searchAll(debouncedQuery),
        enabled: ready,
        staleTime: 30000,
        meta: { suppressGlobalToast: true },
    });

    const { users, games, flat } = useMemo(() => {
        const users = data?.filter((r) => r.type === "Kullanıcı") ?? [];
        const games = (data?.filter((r) => r.type === "Oyun") ?? []).slice(0, 5);
        return { users, games, flat: [...users, ...games] };
    }, [data]);

    // Aktif satir sonuc listesiyle birlikte sifirlanir.
    useEffect(() => setActive(-1), [flat]);

    // Kisayollar: Ctrl/Cmd+K veya "/" (metin alaninda degilken).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
            const isSlash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target);
            if (!isK && !isSlash) return;
            e.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    // Disari tiklaninca liste kapanir; girdi metni kalir.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const select = (result: SearchResult) => {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
        onClose?.();
        router.push(localizeHref(result.link));
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            if (open) setOpen(false);
            else {
                inputRef.current?.blur();
                onClose?.();
            }
            return;
        }
        if (!open || flat.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % flat.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? flat.length - 1 : i - 1));
        } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            select(flat[active]);
        }
    };

    const trimmed = query.trim();
    const showList = open && trimmed.length > 0;
    const searching = trimmed.length >= MIN_CHARS && (isLoading || debouncedQuery !== trimmed);
    const empty = ready && !searching && !isError && flat.length === 0;

    return (
        <div ref={rootRef} className={cn("relative", className)}>
            <div className="group relative flex items-center">
                <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-label={t("topbar.searchLabel")}
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    enterKeyHint="search"
                    value={query}
                    placeholder={t("topbar.searchPlaceholder")}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    className="topbar-field h-9 w-full rounded-full border border-border/60 bg-muted/50 pl-9 pr-16 text-sm text-foreground outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-ring/60 focus:bg-background focus:ring-[3px] focus:ring-ring/25 [&::-webkit-search-cancel-button]:hidden md:pr-20"
                />
                {query ? (
                    <button
                        type="button"
                        aria-label={t("common.clear")}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                ) : (
                    <kbd className="pointer-events-none absolute right-2.5 hidden h-5 select-none items-center gap-0.5 rounded-md border border-border/70 bg-background/70 px-1.5 font-sans text-[10px] font-medium text-muted-foreground md:inline-flex">
                        {isMac ? <span className="text-xs leading-none">⌘</span> : <span>Ctrl</span>}K
                    </kbd>
                )}
            </div>

            {showList ? (
                <div
                    id={listId}
                    role="listbox"
                    className="topbar-dropdown absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-[0_24px_60px_-20px_rgba(8,10,24,0.45)]"
                >
                    <div className="max-h-[min(60vh,24rem)] overflow-y-auto py-1.5">
                        {trimmed.length < MIN_CHARS ? <Hint>{t("topbar.searchMin", { count: MIN_CHARS })}</Hint> : null}
                        {searching ? (
                            <Hint>
                                <Loader2 className="size-3.5 animate-spin" /> {t("topbar.searching")}
                            </Hint>
                        ) : null}
                        {ready && !searching && isError ? <Hint>{t("topbar.searchError")}</Hint> : null}
                        {empty ? <Hint>{t("topbar.noResults")}</Hint> : null}

                        {!searching && users.length > 0 ? (
                            <Group label={t("topbar.users")}>
                                {users.map((result, index) => (
                                    <ResultRow key={`user-${result.id}`} active={index === active} onSelect={() => select(result)} onHover={() => setActive(index)}>
                                        <Avatar className="size-8">
                                            <AvatarImage src={getImageUrl(result.imageUrl)} alt={result.title} />
                                            <AvatarFallback>{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">{result.title}</span>
                                            <span className="block truncate text-xs text-muted-foreground">@{result.id}</span>
                                        </span>
                                    </ResultRow>
                                ))}
                            </Group>
                        ) : null}

                        {!searching && games.length > 0 ? (
                            <Group label={t("topbar.games")}>
                                {games.map((result, index) => {
                                    const flatIndex = users.length + index;
                                    return (
                                        <ResultRow key={`game-${result.id}`} active={flatIndex === active} onSelect={() => select(result)} onHover={() => setActive(flatIndex)}>
                                            {/* Oyun kapaklari 16:9; kare Avatar yerine dogrudan img (gorsel oran + kesin yukleme). */}
                                            {result.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={result.imageUrl} alt="" className="h-8 w-12 shrink-0 rounded-md object-cover" loading="lazy" />
                                            ) : (
                                                <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                                                    {result.title.charAt(0)}
                                                </span>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{result.title}</span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {result.subtitle ? `${t("topbar.game")} · ${result.subtitle}` : t("topbar.game")}
                                                </span>
                                            </span>
                                        </ResultRow>
                                    );
                                })}
                            </Group>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function Hint({ children }: { children: React.ReactNode }) {
    return <p className="flex items-center justify-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-1.5 py-1">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            {children}
        </div>
    );
}

function ResultRow({ active, onSelect, onHover, children }: { active: boolean; onSelect: () => void; onHover: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            role="option"
            aria-selected={active}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={onHover}
            onClick={onSelect}
            className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
            )}
        >
            {children}
        </button>
    );
}
