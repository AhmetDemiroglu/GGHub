import type { SocialProfile } from '@/src/models/social';

export interface MessageDto {
  id: number;
  senderId: number;
  senderUsername: string;
  senderProfileImageUrl?: string | null;
  recipientId: number;
  recipientUsername: string;
  recipientProfileImageUrl?: string | null;
  /** Gercek ad ve profil linki kapisi buradan gelir. Ustteki duz alanlar eski istemciler icin duruyor. */
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
  /** Gercek ad ve profil linki kapisi buradan gelir. Ustteki duz alanlar eski istemciler icin duruyor. */
  partner?: SocialProfile | null;
  lastMessage: string;
  lastMessageSentAt: string;
  unreadCount: number;
}

export interface MessageForCreationDto {
  recipientUsername: string;
  content: string;
}
