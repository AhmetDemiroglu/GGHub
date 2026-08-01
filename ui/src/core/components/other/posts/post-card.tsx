"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, Heart, MessageCircle, MoreHorizontal, Repeat2, Trash2 } from "lucide-react";

import { deletePost, setPostLike, setPostRepost } from "@/api/post/post.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { ReportDialog } from "@/core/components/base/report-dialog";
import { PostText } from "@/core/components/base/post-text";
import { PostImageGrid } from "@/core/components/other/posts/post-image-grid";
import { PostPoll } from "@/core/components/other/posts/post-poll";
import { useAuth } from "@/core/hooks/use-auth";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";
import type { Post } from "@/models/post/post.model";

interface PostCardProps {
    post: Post;
    /** Detay sayfasinda kart daha genis tipografiyle cizilir ve tiklanmaz. */
    variant?: "feed" | "detail";
    onDeleted?: (postId: number) => void;
    className?: string;
}

export function PostCard({ post, variant = "feed", onDeleted, className }: PostCardProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();

    // Repost kartinda GORUNEN icerik kaynak gonderidir; etkilesim sayaclari da
    // kaynagin sayaclaridir (X'te oldugu gibi). Repost eden kisi ust satirda
    // "yeniden paylasti" olarak gosterilir.
    const isRepost = Boolean(post.repostOf);
    const subject = post.repostOf ?? post;

    const [liked, setLiked] = useState(subject.isLiked);
    const [likeCount, setLikeCount] = useState(subject.likeCount);
    const [reposted, setReposted] = useState(subject.isReposted);
    const [repostCount, setRepostCount] = useState(subject.repostCount);
    const [deleted, setDeleted] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Anket bileseniyle ayni sorun: yerel sayaclar ilk prop'ta donup kaliyordu ve
    // sunucudan gelen TAZE kart (refetch, ya da ayni gonderinin baska bir yerde
    // begenilmis hali) yutuluyordu. Kimlik degisince sunucuya teslim ol.
    const [syncedFrom, setSyncedFrom] = useState(subject);
    if (subject !== syncedFrom) {
        setSyncedFrom(subject);
        setLiked(subject.isLiked);
        setLikeCount(subject.likeCount);
        setReposted(subject.isReposted);
        setRepostCount(subject.repostCount);
    }

    const likeMutation = useMutation({
        mutationFn: (next: boolean) => setPostLike(subject.id, next),
        onSuccess: (result) => {
            setLiked(result.isLiked);
            setLikeCount(result.likeCount);
        },
        onError: (error: Error) => {
            // Iyimser guncelleme geri alinir; sunucu gercegi kazanir.
            setLiked(subject.isLiked);
            setLikeCount(subject.likeCount);
            toast.error(t("posts.likeError"), { description: error.message });
        },
    });

    const repostMutation = useMutation({
        mutationFn: (next: boolean) => setPostRepost(subject.id, next),
        onSuccess: (result) => {
            setReposted(result.isReposted);
            setRepostCount(result.repostCount);
        },
        onError: (error: Error) => {
            setReposted(subject.isReposted);
            setRepostCount(subject.repostCount);
            toast.error(t("posts.repostError"), { description: error.message });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deletePost(post.id),
        onSuccess: () => {
            setDeleted(true);
            onDeleted?.(post.id);
            toast.success(t("posts.deleted"));
        },
        onError: (error: Error) => toast.error(t("posts.deleteError"), { description: error.message }),
    });

    if (deleted) return null;

    const dateLocale = locale === "tr" ? tr : enUS;
    const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: dateLocale });
    const author = subject.author;
    const displayName = [author.firstName, author.lastName].filter(Boolean).join(" ") || author.username;

    /**
     * Raporlanan sey kartta GORUNEN icerik, yani repost kartinda kaynak gonderi.
     * Kendi icerigini raporlamak sunucuda zaten reddediliyor; menuyu bosuna
     * gostermemek icin ayni kontrol burada da var.
     */
    const canReport = isAuthenticated && Number(user?.id) !== author.id;

    const toggleLike = () => {
        if (!isAuthenticated) return;
        const next = !liked;
        setLiked(next);
        setLikeCount((c) => c + (next ? 1 : -1));
        likeMutation.mutate(next);
    };

    const toggleRepost = () => {
        if (!isAuthenticated) return;
        const next = !reposted;
        setReposted(next);
        setRepostCount((c) => c + (next ? 1 : -1));
        repostMutation.mutate(next);
    };

    /**
     * Kartin BOS alanina tiklayinca gonderi detayi acilir (X davranisi).
     *
     * Ic ogeler (yazar linki, aksiyon butonlari, menu, anket) kendi islerini
     * yapmaya devam etmeli, o yuzden tiklama gercekten etkilesimli bir ogeden
     * geldiyse burada hicbir sey yapilmaz. Bunu her ic ogeye stopPropagation
     * ekleyerek degil tek noktada closest() ile cozuyoruz: yeni bir buton
     * eklendiginde kimsenin bir sey hatirlamasi gerekmiyor.
     *
     * Metin secmek icin surukleyen kullaniciyi sayfadan atmamak icin aktif
     * secim varsa da cikilir. Klavye/ekran okuyucu yolu ayrica duruyor:
     * zaman damgasi ve yanit sayaci gercek <a> olarak detaya baglaniyor.
     */
    const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
        if (variant === "detail") return;
        if (event.target instanceof HTMLElement && event.target.closest("a,button,input,textarea,[role='menuitem']")) return;
        if (window.getSelection()?.toString()) return;
        router.push(localizeHref(`/posts/${subject.id}`));
    };

    return (
        <>
        <article
            onClick={handleCardClick}
            className={cn(
                "rounded-xl border border-border/50 bg-card/50 p-4 transition-colors",
                variant === "feed" && "cursor-pointer hover:bg-card/80",
                className,
            )}
        >
            {isRepost ? (
                <p className="mb-2 flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                    <Repeat2 className="h-3.5 w-3.5" />
                    {t("posts.repostedBy", { username: post.author.username })}
                </p>
            ) : null}

            {subject.parentAuthorUsername ? (
                <p className="mb-2 pl-1 text-xs text-muted-foreground">
                    {t("posts.replyingTo", { username: subject.parentAuthorUsername })}
                </p>
            ) : null}

            <div className="flex items-start gap-3">
                <Link href={localizeHref(`/profiles/${author.username}`)} className="shrink-0">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={getImageUrl(author.profileImageUrl ?? "")} alt={author.username} />
                        <AvatarFallback>{author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm">
                        <Link
                            href={localizeHref(`/profiles/${author.username}`)}
                            className="truncate font-semibold hover:underline"
                        >
                            {displayName}
                        </Link>
                        <span className="truncate text-muted-foreground">@{author.username}</span>
                        <span className="text-muted-foreground">·</span>
                        <Link
                            href={localizeHref(`/posts/${subject.id}`)}
                            className="shrink-0 text-xs text-muted-foreground hover:underline"
                        >
                            {timeAgo}
                        </Link>

                        {post.canDelete || canReport ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="ml-auto cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {post.canDelete ? (
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onClick={() => deleteMutation.mutate()}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {t("posts.delete")}
                                        </DropdownMenuItem>
                                    ) : null}
                                    {canReport ? (
                                        <DropdownMenuItem variant="destructive" onClick={() => setIsReportOpen(true)}>
                                            <Flag className="h-4 w-4" />
                                            {t("posts.report")}
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}
                    </div>

                    {subject.content ? (
                        <PostText
                            text={subject.content}
                            mentions={subject.mentions}
                            className={cn(
                                "mt-1 block whitespace-pre-wrap break-words",
                                variant === "detail" ? "text-base" : "text-sm",
                            )}
                        />
                    ) : null}

                    <PostImageGrid images={subject.images} />

                    {subject.poll ? (
                        <PostPoll postId={subject.id} poll={subject.poll} canVote={isAuthenticated} />
                    ) : null}

                    <div className="mt-2.5 flex items-center gap-5 text-muted-foreground">
                        <Link
                            href={localizeHref(`/posts/${subject.id}`)}
                            className="flex cursor-pointer items-center gap-1.5 text-xs transition-colors hover:text-sky-500"
                            aria-label={t("posts.replyAction")}
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {subject.replyCount}
                        </Link>

                        <button
                            type="button"
                            onClick={toggleRepost}
                            disabled={!isAuthenticated}
                            className={cn(
                                "flex cursor-pointer items-center gap-1.5 text-xs transition-colors hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-60",
                                reposted && "text-emerald-500",
                            )}
                            aria-label={t("posts.repostAction")}
                            aria-pressed={reposted}
                        >
                            <Repeat2 className="h-3.5 w-3.5" />
                            {repostCount}
                        </button>

                        <button
                            type="button"
                            onClick={toggleLike}
                            disabled={!isAuthenticated}
                            className={cn(
                                "flex cursor-pointer items-center gap-1.5 text-xs transition-colors hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60",
                                liked && "text-rose-500",
                            )}
                            aria-label={t("posts.likeAction")}
                            aria-pressed={liked}
                        >
                            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                            {likeCount}
                        </button>
                    </div>
                </div>
            </div>
        </article>

        {/*
          Diyalog article'in KARDESI: React olaylari React agacinda kabarir, portal
          DOM'da disari cizse bile icerideki tiklama article'in onClick'ine ulasir
          ve kullaniciyi detaya atardi (lightbox'ta ayni hataya dusmustuk).
        */}
        {canReport ? (
            <ReportDialog isOpen={isReportOpen} onOpenChange={setIsReportOpen} entityType="Post" entityId={subject.id} />
        ) : null}
        </>
    );
}
