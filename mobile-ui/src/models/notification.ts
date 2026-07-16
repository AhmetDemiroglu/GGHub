import type { SocialProfile } from '@/src/models/social';

export interface NotificationDto {
  id: number;
  /** Alıcının dilinde render edilmiş tam cümle. Aktörün adı okuma anında çözülür. */
  message: string;
  /** Bildirimi tetikleyen kullanıcı. Eski satırlarda ve silinmiş hesaplarda null. */
  actor: SocialProfile | null;
  link: string | null;
  isRead: boolean;
  type: NotificationType;
  createdAt: string;
}

/** Backend enum'unun aynası (GGHub.Core/Enums/NotificartionType.cs). SADECE sona eklenir. */
export enum NotificationType {
  Follow = 0,
  ListFollow = 1,
  Message = 2,
  Review = 3,
  ListComment = 4,
  CommentReply = 5,
  CommentLike = 6,
  ListRating = 7,
  ReviewComment = 8,
  ReviewCommentReply = 9,
  ReviewCommentLike = 10,
  Mention = 11,
}
