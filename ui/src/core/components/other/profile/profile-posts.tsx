"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";

import { getUserPosts } from "@/api/post/post.api";
import { PostCard } from "@/core/components/other/posts/post-card";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useI18n } from "@/core/contexts/locale-context";
import type { Post } from "@/models/post/post.model";

const PAGE_SIZE = 10;

interface ProfilePostsProps {
    username: string;
}

/**
 * Profildeki "Gonderiler" sekmesi. Akisla AYNI cursor modeli: sunucu sayfa
 * icinde skorlama yapmadigi icin burada cursor son elemanin tarihi olabilirdi,
 * ama akisla tek bir desen tutmak adina yine eldeki en eski createdAt kullaniliyor.
 *
 * Gizlilik tamamen SUNUCUDA: uc once ProfileContentAccess kapisini, sonra
 * gonderi gorunurlugunu uyguluyor. Burada ek bir kapi YOK, olsaydi ikinci bir
 * kural kaynagi olur ve sapabilirdi.
 */
export default function ProfilePosts({ username }: ProfilePostsProps) {
    const t = useI18n();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const postsRef = useRef(posts);
    postsRef.current = posts;

    const load = useCallback(
        async (reset: boolean) => {
            setLoading(true);
            try {
                const cursor = reset
                    ? undefined
                    : postsRef.current.reduce<string | undefined>(
                          (min, post) => (min === undefined || post.createdAt < min ? post.createdAt : min),
                          undefined,
                      );

                const page = await getUserPosts(username, PAGE_SIZE, cursor);

                setPosts((prev) => {
                    const base = reset ? [] : prev;
                    const seen = new Set(base.map((p) => p.id));
                    const fresh = page.filter((p) => !seen.has(p.id));
                    setHasMore(fresh.length > 0 && page.length >= PAGE_SIZE);
                    return [...base, ...fresh];
                });
            } catch {
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        },
        [username],
    );

    useEffect(() => {
        setPosts([]);
        setHasMore(true);
        void load(true);
    }, [load]);

    // IntersectionObserver yalnizca kesisme DURUMU degisince tetiklenir; her
    // eklemeden sonra yeniden kuruluyor ki sentinel gorunur kaldikca akis
    // kendiliginden devam etsin (akistaki ayni desen).
    useEffect(() => {
        if (!hasMore || loading) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) void load(false);
            },
            { rootMargin: "600px 0px" },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loading, posts.length, load]);

    if (loading && posts.length === 0) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">{t("posts.profileEmptyTitle")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
            ))}

            {loading ? <Skeleton className="h-28 rounded-xl" /> : null}
            {hasMore ? <div ref={sentinelRef} className="h-10" /> : null}
        </div>
    );
}
