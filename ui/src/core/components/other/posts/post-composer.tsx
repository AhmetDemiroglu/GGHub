"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Image as ImageIcon, Loader2, X } from "lucide-react";

import { createPost, searchMentionTargets, uploadPostImage } from "@/api/post/post.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";
import { PollEditor, type PollDraft } from "@/core/components/other/posts/poll-editor";
import { useAuth } from "@/core/hooks/use-auth";
import { useDebounce } from "@/core/hooks/use-debounce";
import { useI18n } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import { downscaleImage } from "@/core/lib/image-utils";
import {
    segmentComposerText,
    toTokenizedContent,
    type PickedMention,
} from "@/core/lib/composer-mentions";
import { cn } from "@/core/lib/utils";
import {
    MentionTargetType,
    POLL_MIN_OPTIONS,
    POST_MAX_IMAGES,
    POST_MAX_LENGTH,
    type MentionSuggestion,
    type Post,
} from "@/models/post/post.model";

/**
 * Caret'in solunda yazilmakta olan "@..." parcasi. Oyun ve liste adlari BOSLUK
 * icerdigi icin desen bosluga izin verir; kullanici "@elden ri" yazarken de
 * oneri gelmeli. Bu yuzden ust sinir kisa tutuldu (30), yoksa cumlenin tamami
 * sorgu haline gelirdi.
 */
const ACTIVE_MENTION_PATTERN = /(^|[^\p{L}\p{N}_.])@([^\n@]{0,30})$/u;

const TYPE_CLASS: Record<MentionTargetType, string> = {
    [MentionTargetType.User]: "text-mention",
    [MentionTargetType.Game]: "text-mention-game",
    [MentionTargetType.List]: "text-mention-list",
};

const TYPE_LABEL_KEY: Record<MentionTargetType, string> = {
    [MentionTargetType.User]: "posts.mention.person",
    [MentionTargetType.Game]: "posts.mention.game",
    [MentionTargetType.List]: "posts.mention.list",
};

interface UploadedImage {
    url: string;
    width: number;
    height: number;
}

interface PostComposerProps {
    /** Yanit olusturuluyorsa ana gonderi. */
    parentPostId?: number;
    placeholder?: string;
    autoFocus?: boolean;
    onCreated?: (post: Post) => void;
    className?: string;
}

/**
 * Gonderi olusturma alani.
 *
 * Kullanici DUZ metin gorur ("@Elden Ring"), sunucuya TOKEN gider ("@[g:340]").
 * Cevrim gonderme aninda yapiliyor; alternatif olan "token'i textarea'da
 * tutmak" ya kullaniciya "@[g:340]" gostermeyi ya da metin genisligi tutmayan
 * bir vurgu katmani kurmayi gerektirirdi (ikincisi hizalamayi bozar).
 *
 * Kullanici secilmis bir adi elle bozarsa etiket token'a cevrilemez ve duz
 * metin olarak kalir: yanlis hedefe link verilmez, veri bozulmaz.
 */
export function PostComposer({
    parentPostId,
    placeholder,
    autoFocus,
    onCreated,
    className,
}: PostComposerProps) {
    const t = useI18n();
    const { user, isAuthenticated } = useAuth();

    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const anchorRef = React.useRef<{ start: number; end: number } | null>(null);
    const pendingCaretRef = React.useRef<number | null>(null);

    const [value, setValue] = React.useState("");
    const [picked, setPicked] = React.useState<PickedMention[]>([]);
    const [images, setImages] = React.useState<UploadedImage[]>([]);
    const [uploading, setUploading] = React.useState(false);
    const [poll, setPoll] = React.useState<PollDraft | null>(null);
    const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);

    const debouncedQuery = useDebounce(mentionQuery, 250);
    const isQueryable = !!debouncedQuery && debouncedQuery.trim().length >= 1;

    const { data: candidates, isFetching } = useQuery({
        queryKey: ["mention-targets", debouncedQuery],
        queryFn: () => searchMentionTargets(debouncedQuery as string),
        enabled: isQueryable,
        staleTime: 30_000,
    });

    const suggestions = isQueryable ? (candidates ?? []) : [];
    const isOpen = mentionQuery !== null && mentionQuery.trim().length >= 1;

    /**
     * Gorunen uzunluk. Token'lar henuz metinde olmadigi icin bu dogrudan
     * value.length; sunucu da ayni sayiyi olcuyor (MentionTokens.VisibleLength
     * token'i cozulmus ada geri cevirip sayiyor).
     */
    const length = value.length;
    const isOverLimit = length > POST_MAX_LENGTH;
    const hasPoll = poll !== null && poll.options.filter((o) => o.trim()).length >= POLL_MIN_OPTIONS;
    const canSubmit =
        isAuthenticated && !isOverLimit && (value.trim().length > 0 || images.length > 0 || hasPoll);

    const closeSuggestions = React.useCallback(() => {
        anchorRef.current = null;
        setMentionQuery(null);
        setHighlightedIndex(0);
    }, []);

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
        [closeSuggestions],
    );

    const insertMention = React.useCallback(
        (suggestion: MentionSuggestion) => {
            const anchor = anchorRef.current;
            if (!anchor) return;

            const insertion = `@${suggestion.display}`;
            const next = `${value.slice(0, anchor.start)}${insertion} ${value.slice(anchor.end)}`;

            pendingCaretRef.current = anchor.start + insertion.length + 1;
            setPicked((prev) => [...prev, { text: insertion, type: suggestion.type, id: suggestion.id }]);
            setValue(next);
            closeSuggestions();
        },
        [closeSuggestions, value],
    );

    React.useEffect(() => {
        const caret = pendingCaretRef.current;
        if (caret === null) return;

        pendingCaretRef.current = null;
        const element = textareaRef.current;
        if (!element) return;

        element.focus();
        element.setSelectionRange(caret, caret);
    }, [value]);

    const createMutation = useMutation({
        mutationFn: () =>
            createPost({
                content: value.trim().length > 0 ? toTokenizedContent(value, picked) : null,
                imageUrls: images.map((i) => i.url),
                poll: hasPoll
                    ? {
                          options: poll!.options.map((o) => o.trim()).filter(Boolean),
                          durationDays: poll!.durationDays,
                      }
                    : null,
                parentPostId: parentPostId ?? null,
            }),
        onSuccess: (post) => {
            setValue("");
            setPicked([]);
            setImages([]);
            setPoll(null);
            toast.success(parentPostId ? t("posts.replySent") : t("posts.created"));
            onCreated?.(post);
        },
        onError: (error: Error) => toast.error(t("posts.createError"), { description: error.message }),
    });

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const room = POST_MAX_IMAGES - images.length;
        if (room <= 0) {
            toast.error(t("posts.imageLimit", { count: POST_MAX_IMAGES }));
            return;
        }

        setUploading(true);
        try {
            const picked = Array.from(files).slice(0, room);
            // Istemcide once kucultuluyor: 12 MP telefon fotografini ham gondermek
            // hem yavas hem de sunucunun 5 MB tavanina takilir.
            const uploads = await Promise.all(
                picked.map(async (file) => uploadPostImage(await downscaleImage(file, 1280))),
            );
            setImages((prev) => [...prev, ...uploads]);
        } catch (error) {
            toast.error(t("posts.imageUploadError"), {
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setUploading(false);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className={cn("rounded-xl border border-border/50 bg-card/50 p-4", className)}>
            <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={getImageUrl(user?.profileImageUrl ?? "")} alt={user?.username ?? ""} />
                    <AvatarFallback>{(user?.username ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="relative">
                        {/*
                            YAZARKEN canli vurgulama. <textarea> metnin bir bolumunu
                            boyayamaz, bu yuzden ARKASINA birebir ayni tipografi ve
                            kutu metrikleriyle bir katman koyuyoruz: gercek metni o
                            katman cizer, textarea'nin kendi yazisi seffaftir.

                            Olmadan kullanici etiketinin tuttugunu ancak GONDERDIKTEN
                            sonra anliyordu; secim yaptigina dair hicbir isaret yoktu.
                            Ayni numara incelemelerdeki MentionTextarea'da da var.
                        */}
                        <div
                            aria-hidden
                            className={cn(
                                "pointer-events-none absolute inset-0 min-h-[60px] whitespace-pre-wrap break-words px-0 py-2 text-base md:text-sm",
                                "overflow-hidden",
                            )}
                        >
                            {segmentComposerText(value, picked).map((segment, i) =>
                                segment.kind === "mention" ? (
                                    <span key={i} className={cn("font-medium", TYPE_CLASS[segment.type])}>
                                        {segment.value}
                                    </span>
                                ) : (
                                    <span key={i}>{segment.value}</span>
                                ),
                            )}
                            {/* Metin yeni satirla bitiyorsa son satir olcuye girmez;
                                katman bir satir kisa kalip kaymasin diye sifir
                                genislikli karakter. */}
                            {"\u200b"}
                        </div>

                        <Textarea
                            ref={textareaRef}
                            value={value}
                            autoFocus={autoFocus}
                            rows={2}
                            placeholder={placeholder ?? t("posts.placeholder")}
                            // Yazi seffaf: gercek metni arkadaki katman ciziyor.
                            // Imlec ve secim gorunur kalsin diye ayrica veriliyor;
                            // secim rengi yari saydam olmali yoksa arkadaki metni orter.
                            className="relative min-h-[60px] resize-none border-0 bg-transparent px-0 py-2 text-transparent shadow-none caret-foreground selection:bg-primary/30 focus-visible:ring-0"
                            onChange={(event) => {
                                setValue(event.target.value);
                                if (pendingCaretRef.current === null) syncMentionState(event.target);
                            }}
                            onSelect={(event) => {
                                if (pendingCaretRef.current === null) syncMentionState(event.currentTarget);
                            }}
                            onBlur={closeSuggestions}
                            onKeyDown={(event) => {
                                if (!isOpen || suggestions.length === 0) return;

                                if (event.key === "ArrowDown") {
                                    event.preventDefault();
                                    setHighlightedIndex((i) => (i + 1) % suggestions.length);
                                } else if (event.key === "ArrowUp") {
                                    event.preventDefault();
                                    setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
                                } else if (event.key === "Enter" || event.key === "Tab") {
                                    event.preventDefault();
                                    insertMention(suggestions[highlightedIndex]);
                                } else if (event.key === "Escape") {
                                    event.preventDefault();
                                    closeSuggestions();
                                }
                            }}
                        />

                        {isOpen && (isFetching || suggestions.length > 0) ? (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
                                {suggestions.length === 0 && isFetching ? (
                                    <div className="flex items-center justify-center p-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    suggestions.map((candidate, index) => (
                                        <button
                                            key={`${candidate.type}-${candidate.id}`}
                                            type="button"
                                            // Tiklamada blur olmasin: blur listeyi kapatir ve click hic gelmez.
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => insertMention(candidate)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={cn(
                                                "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors",
                                                index === highlightedIndex ? "bg-accent" : "hover:bg-accent/50",
                                            )}
                                        >
                                            {candidate.imageUrl ? (
                                                <Avatar className="h-7 w-7 shrink-0 rounded-md">
                                                    <AvatarImage
                                                        src={getImageUrl(candidate.imageUrl)}
                                                        alt={candidate.display}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback className="rounded-md text-[10px]">
                                                        {candidate.display.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold">
                                                    {candidate.display.slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={cn("truncate text-sm font-medium", TYPE_CLASS[candidate.type])}>
                                                    {candidate.display}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {t(TYPE_LABEL_KEY[candidate.type])}
                                                    {candidate.subtitle ? ` · ${candidate.subtitle}` : ""}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : null}
                    </div>

                    {images.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {images.map((image, index) => (
                                <div key={image.url} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                                    {/* next/image degil: R2 adresi yeni yuklendi, onizleme icin
                                        optimizasyon zinciri gereksiz gecikme yaratir. */}
                                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                                        className="absolute right-0.5 top-0.5 cursor-pointer rounded-full bg-black/60 p-0.5 text-white transition-colors hover:bg-black/80"
                                        aria-label={t("posts.removeImage")}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {poll ? <PollEditor draft={poll} onChange={setPoll} onRemove={() => setPoll(null)} /> : null}

                    <div className="mt-2 flex items-center gap-1">
                        <label
                            className={cn(
                                "cursor-pointer rounded-full p-2 text-primary transition-colors hover:bg-primary/10",
                                (images.length >= POST_MAX_IMAGES || poll !== null || uploading) &&
                                    "pointer-events-none opacity-40",
                            )}
                            aria-label={t("posts.addImage")}
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ImageIcon className="h-4 w-4" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                    void handleFiles(event.target.files);
                                    event.target.value = "";
                                }}
                            />
                        </label>

                        <button
                            type="button"
                            onClick={() => setPoll({ options: ["", ""], durationDays: 1 })}
                            disabled={poll !== null || images.length > 0}
                            className="cursor-pointer rounded-full p-2 text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
                            aria-label={t("posts.addPoll")}
                        >
                            <BarChart3 className="h-4 w-4" />
                        </button>

                        <span
                            className={cn(
                                "ml-auto text-xs tabular-nums",
                                isOverLimit ? "font-semibold text-destructive" : "text-muted-foreground",
                            )}
                        >
                            {length}/{POST_MAX_LENGTH}
                        </span>

                        <Button
                            size="sm"
                            className="ml-2 rounded-full"
                            disabled={!canSubmit || createMutation.isPending || uploading}
                            onClick={() => createMutation.mutate()}
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : parentPostId ? (
                                t("posts.reply")
                            ) : (
                                t("posts.share")
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
