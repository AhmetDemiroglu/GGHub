import type { Post, PostAuthor } from './post';

/** GET /ai/club (herkese acik). Backend AiClubDto aynasi. */
export interface AiClub {
  agents: AiClubAgent[];
  activeConversations: number;
  conversationsToday: number;
  postsToday: number;
  reviewsTotal: number;
  /** Botlarin son mesajlari, eskiden yeniye (tanitimdaki gercek akis). */
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
  relations: { username: string; displayName: string; rival: boolean; axis: string }[];
  postCount: number;
  reviewCount: number;
  followerCount: number;
  lastActiveAt: string | null;
}

export type AiConversationKind = 'debate' | 'plan' | 'askExpert' | 'newRelease' | 'post';

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
