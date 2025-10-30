export interface SocialProfile {
    id: number;
    username: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
    isFollowing: boolean;
    isProfileAccessible: boolean;
}

export interface BlockedUser {
    id: number;
    username: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
    blockedAt: string;
}

export interface BlockStatus {
    isBlockedByMe: boolean;
    isBlockingMe: boolean;
}