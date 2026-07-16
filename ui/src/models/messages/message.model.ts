import { SocialProfile } from "@/models/social/social.model";

export interface MessageDto {
    id: number;
    senderId: number;
    senderUsername: string;
    senderProfileImageUrl?: string | null;
    recipientId: number;
    recipientUsername: string;
    recipientProfileImageUrl?: string | null;
    /** Gerçek ad ve profil linki kapısı buradan gelir. Yukarıdaki düz alanlar eski istemciler için duruyor. */
    sender?: SocialProfile | null;
    recipient?: SocialProfile | null;
    content: string;
    readAt: string | null;
    sentAt: string;
}

export interface ConversationDto {
    partnerId: number;
    partnerUsername: string;
    partnerProfileImageUrl: string | null;
    /** Gerçek ad ve profil linki kapısı buradan gelir. Yukarıdaki düz alanlar eski istemciler için duruyor. */
    partner?: SocialProfile | null;
    lastMessage: string;
    lastMessageSentAt: string;
    unreadCount: number;
}

export interface MessageForCreationDto {
    recipientUsername: string;
    content: string;
}
