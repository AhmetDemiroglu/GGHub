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
  ListComment = 4,
  CommentReply = 5,
  CommentLike = 6,
  ListRating = 7,
}
