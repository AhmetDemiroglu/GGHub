"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";

import { getPost, getPostReplies } from "@/api/post/post.api";
import { PostCard } from "@/core/components/other/posts/post-card";
import { PostComposer } from "@/core/components/other/posts/post-composer";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";

const REPLIES_PAGE_SIZE = 10;

export default function PostDetailPage() {
    const params = useParams();
    const postId = Number(params.postId);
    const t = useI18n();
    const router = useRouter();
    const localizeHref = useLocalizedHref();
    const queryClient = useQueryClient();

    const postQueryKey = useMemo(() => ["post", postId], [postId]);
    const repliesQueryKey = useMemo(() => ["post-replies", postId], [postId]);

    const { data: post, isLoading, isError } = useQuery({
        queryKey: postQueryKey,
        queryFn: () => getPost(postId),
        enabled: Number.isFinite(postId),
        // Erisim yoksa sunucu 404 donuyor (403 gonderinin varligini sizdirirdi),
        // tekrar denemenin anlami yok.
        retry: false,
    });

    const {
        data: repliesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: repliesLoading,
    } = useInfiniteQuery({
        queryKey: repliesQueryKey,
        queryFn: ({ pageParam }) => getPostReplies(postId, { page: pageParam, pageSize: REPLIES_PAGE_SIZE }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
            return loaded < lastPage.totalCount ? allPages.length + 1 : undefined;
        },
        enabled: Number.isFinite(postId) && !!post,
        staleTime: 30_000,
    });

    const replies = useMemo(() => repliesData?.pages.flatMap((page) => page.items) ?? [], [repliesData]);

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-2xl space-y-3 p-2 md:p-4">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
            </div>
        );
    }

    if (isError || !post) {
        return (
            <div className="mx-auto w-full max-w-2xl space-y-4 p-6 text-center">
                <h1 className="text-xl font-bold">{t("posts.notFoundTitle")}</h1>
                <p className="text-sm text-muted-foreground">{t("posts.notFoundDescription")}</p>
                <Button asChild variant="outline">
                    <Link href={localizeHref("/")}>{t("posts.backHome")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-3 p-2 md:p-4">
            <button
                type="button"
                onClick={() => router.back()}
                className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                {t("common.back")}
            </button>

            <PostCard
                post={post}
                variant="detail"
                // Gonderi silindiginde detayda kalmanin anlami yok.
                onDeleted={() => router.push(localizeHref("/"))}
            />

            {post.canReply ? (
                <PostComposer
                    parentPostId={post.id}
                    placeholder={t("posts.replyPlaceholder")}
                    onCreated={() => {
                        void queryClient.invalidateQueries({ queryKey: repliesQueryKey });
                        void queryClient.invalidateQueries({ queryKey: postQueryKey });
                    }}
                />
            ) : (
                <p className="rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                    {t("posts.replyDisabled")}
                </p>
            )}

            <div className="flex items-center gap-2 pt-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">{t("posts.repliesTitle")}</h2>
            </div>

            {repliesLoading ? (
                <Skeleton className="h-24 rounded-xl" />
            ) : replies.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("posts.repliesEmpty")}</p>
            ) : (
                <div className="space-y-3">
                    {replies.map((reply) => (
                        <PostCard
                            key={reply.id}
                            post={reply}
                            onDeleted={() => void queryClient.invalidateQueries({ queryKey: repliesQueryKey })}
                        />
                    ))}
                </div>
            )}

            {hasNextPage ? (
                <div className="flex justify-center pt-2">
                    <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                        {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.showMore")}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
