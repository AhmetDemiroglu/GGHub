"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { searchMentions } from "@/api/search/search.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Textarea } from "@/core/components/ui/textarea";
import { useDebounce } from "@/core/hooks/use-debounce";
import { displayName } from "@/core/lib/display-name";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";

/**
 * Caret'in hemen solunda yazilmakta olan "@handle" parcasini yakalar.
 * Grup 1 = "@" oncesi karakter (bos olabilir), Grup 2 = o ana kadar yazilan handle.
 * Uzunluk alt siniri 0: kullanici daha yazmayi bitirmedi, ilk karakterden itibaren oneri gosteririz.
 */
const ACTIVE_MENTION_PATTERN = /(^|[^\p{L}\p{N}_.])@([\p{L}\p{N}_.]{0,30})$/u;

interface MentionTextareaProps extends Omit<React.ComponentProps<"textarea">, "value" | "onChange"> {
    value: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    /** Oneri listesine ekstra sinif. */
    popoverClassName?: string;
    /** Sarmalayici div'e ekstra sinif. */
    wrapperClassName?: string;
}

/**
 * "@" ile mention onerisi acan textarea. Kontrollu bir alandir: react-hook-form'un
 * {...field} yayilimiyla (value/onChange/onBlur/name/ref) oldugu gibi calisir.
 */
export const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(function MentionTextarea(
    { value, onChange, onKeyDown, onBlur, onSelect, className, popoverClassName, wrapperClassName, ...props },
    forwardedRef
) {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    /** Yazilmakta olan "@handle" parcasinin metindeki araligi. */
    const anchorRef = React.useRef<{ start: number; end: number } | null>(null);
    /** Programatik ekleme sonrasi caret'in konacagi yer. */
    const pendingCaretRef = React.useRef<number | null>(null);

    const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);

    const debouncedQuery = useDebounce(mentionQuery, 250);
    const isQueryable = !!debouncedQuery && debouncedQuery.length >= 1;

    const { data: candidates, isFetching } = useQuery({
        queryKey: ["mention-search", debouncedQuery],
        queryFn: () => searchMentions(debouncedQuery as string),
        enabled: isQueryable,
        staleTime: 30_000,
    });

    const suggestions = isQueryable ? (candidates ?? []) : [];
    const isOpen = mentionQuery !== null && mentionQuery.length >= 1;

    const setRefs = React.useCallback(
        (node: HTMLTextAreaElement | null) => {
            textareaRef.current = node;
            if (typeof forwardedRef === "function") {
                forwardedRef(node);
            } else if (forwardedRef) {
                forwardedRef.current = node;
            }
        },
        [forwardedRef]
    );

    const closeSuggestions = React.useCallback(() => {
        anchorRef.current = null;
        setMentionQuery(null);
        setHighlightedIndex(0);
    }, []);

    /** Caret konumuna gore mention durumunu tazeler. */
    const syncMentionState = React.useCallback(
        (element: HTMLTextAreaElement) => {
            const caret = element.selectionStart ?? element.value.length;
            const match = ACTIVE_MENTION_PATTERN.exec(element.value.slice(0, caret));

            if (!match) {
                closeSuggestions();
                return;
            }

            anchorRef.current = { start: match.index + match[1].length, end: caret };
            setMentionQuery(match[2]);
            setHighlightedIndex(0);
        },
        [closeSuggestions]
    );

    /**
     * Degeri native setter ile yazip gercek bir input olayi tetikler. React'in value-tracker'i
     * atlandigi icin onChange kesin calisir; boylece hem react-hook-form hem de duz setState
     * kullanan cagiranlar ayni sekilde guncellenir.
     */
    const emitChange = React.useCallback((nextValue: string) => {
        const element = textareaRef.current;
        if (!element) return;

        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
        nativeSetter?.call(element, nextValue);
        element.dispatchEvent(new Event("input", { bubbles: true }));
    }, []);

    const insertMention = React.useCallback(
        (username: string) => {
            const anchor = anchorRef.current;
            const element = textareaRef.current;
            if (!anchor || !element) return;

            const insertion = `@${username} `;
            const nextValue = `${value.slice(0, anchor.start)}${insertion}${value.slice(anchor.end)}`;

            // Deger degismezse parent re-render etmez, caret effect'i hic calismaz ve
            // pendingCaretRef takili kalirdi. O yuzden erken cik.
            if (nextValue === value) {
                closeSuggestions();
                return;
            }

            pendingCaretRef.current = anchor.start + insertion.length;
            closeSuggestions();
            emitChange(nextValue);
        },
        [closeSuggestions, emitChange, value]
    );

    // Programatik eklemeden sonra caret'i eklenen handle'in arkasina tasi.
    React.useEffect(() => {
        const caret = pendingCaretRef.current;
        if (caret === null) return;

        pendingCaretRef.current = null;
        const element = textareaRef.current;
        if (!element) return;

        element.focus();
        element.setSelectionRange(caret, caret);
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(event);

        // Programatik ekleme sirasinda caret henuz dogru yerde degil; durumu insertMention zaten ayarladi.
        if (pendingCaretRef.current === null) {
            syncMentionState(event.target);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isOpen && suggestions.length > 0) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlightedIndex((index) => (index + 1) % suggestions.length);
                return;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                insertMention(suggestions[highlightedIndex].username);
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                closeSuggestions();
                return;
            }
        }

        onKeyDown?.(event);
    };

    return (
        <div className={cn("relative", wrapperClassName)}>
            <Textarea
                {...props}
                ref={setRefs}
                value={value}
                className={className}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onSelect={(event) => {
                    if (pendingCaretRef.current === null) {
                        syncMentionState(event.currentTarget);
                    }
                    onSelect?.(event);
                }}
                onBlur={(event) => {
                    closeSuggestions();
                    onBlur?.(event);
                }}
            />

            {isOpen && (isFetching || suggestions.length > 0) ? (
                <div
                    className={cn(
                        "absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg",
                        popoverClassName
                    )}
                >
                    {suggestions.length === 0 && isFetching ? (
                        <div className="flex items-center justify-center p-3">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        suggestions.map((candidate, index) => (
                            <button
                                key={candidate.id}
                                type="button"
                                // Tiklamada blur olmasin: blur popover'i kapatir ve click hic gelmez.
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => insertMention(candidate.username)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={cn(
                                    "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors",
                                    index === highlightedIndex ? "bg-accent" : "hover:bg-accent/50"
                                )}
                            >
                                <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarImage src={getImageUrl(candidate.profileImageUrl)} alt={candidate.username} />
                                    <AvatarFallback className="text-[10px]">{candidate.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{displayName(candidate)}</p>
                                    <p className="truncate text-xs text-muted-foreground">@{candidate.username}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
});
