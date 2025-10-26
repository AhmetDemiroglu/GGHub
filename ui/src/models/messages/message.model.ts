export interface MessageDto {
    id: number;
    senderId: number;
    senderUsername: string;
    recipientId: number;
    recipientUsername: string;
    content: string;
    readAt: string | null;
    sentAt: string;
}

export interface ConversationDto {
    partnerId: number;
    partnerUsername: string;
    partnerProfileImageUrl: string | null;
    lastMessage: string;
    lastMessageSentAt: string;
    unreadCount: number;
}

export interface MessageForCreationDto {
    recipientUsername: string;
    content: string;
}