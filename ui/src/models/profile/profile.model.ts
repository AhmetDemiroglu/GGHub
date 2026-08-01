import { PostReplyPermissionSetting, PostVisibilitySetting } from "@/models/post/post.model";

export interface Profile {
    id: number;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    profileImageUrl: string | null;
    headerImageUrl: string | null;
    dateOfBirth: Date | null;
    createdAt: string;
    status: string | null;
    phoneNumber: string | null;
    profileVisibility: number;
    messageSetting: number;
    postVisibility: number;
    postReplyPermission: number;
    isEmailPublic: boolean;
    isPhoneNumberPublic: boolean;
    isDateOfBirthPublic: boolean;
}

/**
 * PUT /profile/me govdesinin TAMAMI. Sunucu (ProfileService.UpdateProfileAsync) alanlari
 * KOSULSUZ atar, yani gonderilmeyen alan null'a duser ve VERI SILINIR. Bu yuzden alanlarin
 * hicbiri opsiyonel degil: bir alani unutmak derleme hatasi vermeli, sessiz veri kaybi degil.
 */
export interface ProfileForUpdate {
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    status: string | null;
    phoneNumber: string | null;
    dateOfBirth: Date | string | null;
    isEmailPublic: boolean;
    isPhoneNumberPublic: boolean;
    isDateOfBirthPublic: boolean;
    profileImageUrl: string | null;
}

/**
 * Kutlama sayfasinin verisi. GET /profile/me/birthday, YALNIZCA token sahibinin kendisi.
 * Endpoint kullanici kimligi ALMAZ, dolayisiyla baskasinin sayfasi cagrilamaz.
 */
export interface Birthday {
    displayName: string;
    username: string;
    profileImageUrl: string | null;
    /** "yyyy-MM-dd". En son gerceklesen dogum gunu, sunucuda Istanbul saatiyle hesaplanir. */
    celebrationDate: string;
    isToday: boolean;
}

export enum ProfileVisibilitySetting {
    Public = 0,
    Followers = 1,
    Private = 2,
}

export enum MessagePrivacySetting {
    Everyone = 0,
    Following = 1,
    None = 2,
}

export interface UpdateProfileVisibilityDto {
    newVisibility: ProfileVisibilitySetting;
}

export interface UpdateMessageSettingDto {
    newSetting: MessagePrivacySetting;
}

export interface UpdatePostVisibilityDto {
    newVisibility: PostVisibilitySetting;
}

export interface UpdatePostReplyPermissionDto {
    newPermission: PostReplyPermissionSetting;
}

export interface PublicProfile {
    id: number;
    username: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    profileImageUrl: string | null;
    headerImageUrl: string | null;
    dateOfBirth: string | null;
    createdAt: string;
    status: string | null;
    phoneNumber: string | null;
    isEmailPublic: boolean;
    isPhoneNumberPublic: boolean;
    profileVisibility: number;
    isDateOfBirthPublic: boolean;
    messageSetting: number;
    isFollowing?: boolean;
    isFollowedBy?: boolean;
    followerCount?: number;
    followingCount?: number;
    isBlockedByMe?: boolean;
    isBlockingMe?: boolean;
    reviewCount?: number;
    listCount?: number;
    /** Okuyucunun gorebildigi kok gonderi sayisi; 0 ise Gonderiler sekmesi cizilmez. */
    postCount?: number;
}
