/**
 * Backend aynasi: GGHub.Application/Dtos/PostDto.cs ve
 * GGHub.Core/Enums/MentionTargetType.cs. Sayisal degerler SONA eklenir.
 */

export enum MentionTargetType {
    User = 0,
    Game = 1,
    List = 2,
}

/** Backend aynasi: GGHub.Core/Enums/PostVisibilitySetting.cs */
export enum PostVisibilitySetting {
    Everyone = 0,
    Followers = 1,
    Private = 2,
}

/** Backend aynasi: GGHub.Core/Enums/PostReplyPermissionSetting.cs */
export enum PostReplyPermissionSetting {
    Everyone = 0,
    Followers = 1,
    Following = 2,
    Nobody = 3,
}

export interface PostAuthor {
    id: number;
    username: string;
    profileImageUrl: string | null;
    firstName?: string | null;
    lastName?: string | null;
    isFollowing?: boolean;
    isProfileAccessible?: boolean;
}

export interface PostImage {
    url: string;
    width?: number | null;
    height?: number | null;
    position: number;
}

export interface PostMention {
    type: MentionTargetType;
    id: number;
    display: string;
    slug?: string | null;
    /** false ise hedef silinmis ya da bu kullanici onu goremiyor: duz gri metin basilir. */
    resolved: boolean;
}

export interface PostPollOption {
    id: number;
    text: string;
    position: number;
    voteCount: number;
}

export interface PostPoll {
    id: number;
    endsAt: string;
    isClosed: boolean;
    totalVotes: number;
    myOptionId?: number | null;
    options: PostPollOption[];
}

export interface Post {
    id: number;
    /** Token'li ham metin ("@[u:12] harika @[g:340]"); mentions ile birlikte cizilir. */
    content: string | null;
    createdAt: string;
    author: PostAuthor;
    likeCount: number;
    replyCount: number;
    repostCount: number;
    isLiked: boolean;
    isReposted: boolean;
    canReply: boolean;
    canDelete: boolean;
    parentPostId?: number | null;
    parentAuthorUsername?: string | null;
    /** Repost ise kaynak gonderi. Ic ice repost yok, tek seviye. */
    repostOf?: Post | null;
    images: PostImage[];
    mentions: PostMention[];
    poll?: PostPoll | null;
}

export interface PostInteractionResult {
    postId: number;
    likeCount: number;
    repostCount: number;
    isLiked: boolean;
    isReposted: boolean;
}

export interface PostPollForCreation {
    options: string[];
    /** 1-7 gun. */
    durationDays: number;
}

export interface PostForCreation {
    content?: string | null;
    imageUrls: string[];
    poll?: PostPollForCreation | null;
    parentPostId?: number | null;
}

export interface MentionSuggestion {
    type: MentionTargetType;
    id: number;
    display: string;
    imageUrl?: string | null;
    subtitle?: string | null;
}

/** Gonderi olustururken en fazla kac gorsel eklenebilir (backend de dogruluyor). */
export const POST_MAX_IMAGES = 4;
/** Kullaniciya gorunen karakter siniri. Token uzunlugu DEGIL, cozulmus ad uzunlugu sayilir. */
export const POST_MAX_LENGTH = 200;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 4;
export const POLL_MAX_OPTION_LENGTH = 40;
