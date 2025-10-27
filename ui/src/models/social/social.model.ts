export interface SocialProfile {
    id: number;
    username: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
    isFollowing: boolean;
    isProfileAccessible: boolean;
}
