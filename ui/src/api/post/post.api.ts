import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import type {
    MentionSuggestion,
    Post,
    PostForCreation,
    PostInteractionResult,
    PostPoll,
} from "@/models/post/post.model";
import { MentionTargetType } from "@/models/post/post.model";

export const createPost = (dto: PostForCreation): Promise<Post> =>
    axiosInstance.post<Post>("/posts", dto).then((r) => r.data);

export const deletePost = (postId: number): Promise<void> =>
    axiosInstance.delete(`/posts/${postId}`).then(() => undefined);

export const getPost = (postId: number): Promise<Post> =>
    axiosInstance.get<Post>(`/posts/${postId}`).then((r) => r.data);

export const getPostReplies = (
    postId: number,
    params: { page: number; pageSize: number },
): Promise<PaginatedResponse<Post>> =>
    axiosInstance
        .get<PaginatedResponse<Post>>(`/posts/${postId}/replies`, { params })
        .then((r) => r.data);

/** Profil "Gonderiler" sekmesi. Akisla ayni cursor modeli (en eski occurredAt). */
export const getUserPosts = (username: string, limit = 20, cursor?: string): Promise<Post[]> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return axiosInstance.get<Post[]>(`/posts/user/${username}?${params.toString()}`).then((r) => r.data);
};

export const setPostLike = (postId: number, liked: boolean): Promise<PostInteractionResult> =>
    liked
        ? axiosInstance.post<PostInteractionResult>(`/posts/${postId}/like`).then((r) => r.data)
        : axiosInstance.delete<PostInteractionResult>(`/posts/${postId}/like`).then((r) => r.data);

export const setPostRepost = (postId: number, reposted: boolean): Promise<PostInteractionResult> =>
    reposted
        ? axiosInstance.post<PostInteractionResult>(`/posts/${postId}/repost`).then((r) => r.data)
        : axiosInstance.delete<PostInteractionResult>(`/posts/${postId}/repost`).then((r) => r.data);

export const votePostPoll = (postId: number, optionId: number): Promise<PostPoll> =>
    axiosInstance.post<PostPoll>(`/posts/${postId}/poll/vote`, { optionId }).then((r) => r.data);

const TYPE_PARAM: Record<MentionTargetType, string> = {
    [MentionTargetType.User]: "user",
    [MentionTargetType.Game]: "game",
    [MentionTargetType.List]: "list",
};

/**
 * Tipli etiket onerileri. Mevcut /search/mentions ucu BILEREK kullanilmiyor:
 * o uc yalnizca kisi doner ve magazadaki eski mobil surumler onu cagiriyor.
 */
export const searchMentionTargets = (
    query: string,
    types?: MentionTargetType[],
): Promise<MentionSuggestion[]> => {
    const params = new URLSearchParams({ q: query });
    if (types?.length) params.set("types", types.map((t) => TYPE_PARAM[t]).join(","));
    return axiosInstance
        .get<MentionSuggestion[]>(`/search/mention-targets?${params.toString()}`)
        .then((r) => r.data);
};

export interface PostImageUploadResponse {
    url: string;
    width: number;
    height: number;
}

const EXTENSION_MAP: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
};

/**
 * Gorseller TEK TEK yuklenir, sonra donen adresler gonderi govdesinde yollanir.
 * Cok dosyali tek istek yerine bu secildi: gorsel basina ilerleme gosterilebiliyor
 * ve mevcut tek dosyalik yardimcilar bozulmuyor.
 */
export const uploadPostImage = async (file: File): Promise<PostImageUploadResponse> => {
    const formData = new FormData();
    const extension = EXTENSION_MAP[file.type] || ".jpg";
    formData.append("file", file, `post${extension}`);

    const response = await axiosInstance.post<PostImageUploadResponse>("/photos/post", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
};
