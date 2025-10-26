export interface NotificationDto {
    id: number;
    message: string;
    link: string | null;
    isRead: boolean;
    type: NotificationType;
    createdAt: string;
}

export enum NotificationType {
    Follow = 0,
    ListFollow = 1,
    Message = 2,
    Review = 3,
}