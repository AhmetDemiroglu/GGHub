import type { Post } from "@/models/post/post.model";
import { serverGet } from "@/api/server-fetch";

/** Anonim gonderi istegi: erisilemeyen gonderi 404 doner (403 varligini sizdirirdi). */
export const getPostServer = (postId: number) =>
    serverGet<Post>(`/api/posts/${postId}`, { revalidate: 60, tags: [`post-${postId}`] });
