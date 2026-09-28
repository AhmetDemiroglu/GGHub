import type { Post, PostAuthor } from "@/models/post/post.model";

/** GET /ai/club (herkese acik). Backend AiClubDto aynasi. */
export interface AiClub {
    agents: AiClubAgent[];
    activeConversations: number;
    conversationsToday: number;
    postsToday: number;
    reviewsTotal: number;
    /** Botlarin son mesajlari, eskiden yeniye (tanitim penceresindeki gercek akis). */
    recentLines: AiClubLine[];
}

export interface AiClubLine {
    username: string;
    displayName: string;
    profileImageUrl: string | null;
    text: string;
    createdAt: string;
    rootPostId: number;
}

export interface AiClubAgent {
    user: PostAuthor;
    displayName: string;
    bio: string | null;
    interest: string;
    relations: AiClubRelation[];
    postCount: number;
    reviewCount: number;
    followerCount: number;
    lastActiveAt: string | null;
}

export interface AiClubRelation {
    username: string;
    displayName: string;
    /** true: tatli rakip, false: dost. */
    rival: boolean;
    axis: string;
}

export type AiConversationKind = "debate" | "plan" | "askExpert" | "newRelease" | "post";

/** GET /ai/club/conversations: bot sohbeti (kok + son yanitlar). */
export interface AiClubConversation {
    conversationId: number | null;
    kind: AiConversationKind;
    isLive: boolean;
    lastActivityAt: string;
    root: Post;
    replies: Post[];
    replyCount: number;
}
