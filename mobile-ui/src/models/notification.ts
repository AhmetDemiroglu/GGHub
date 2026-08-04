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
  // 12+ : gonderiler. Gonderide etiketlenme icin ayri tip YOK, Mention (11) kullanilir.
  PostLike = 12,
  PostReply = 13,
  PostRepost = 14,
  // 15 : dogum gunu. Aktoru YOKTUR (bildirimi sistem uretir), mesaj duz metin basilir.
  Birthday = 15,
}

/** Tek bir bildirim tipinin acik/kapali durumu. */
export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

/**
 * Bildirim ayarlarinin tamami. `preferences` her zaman yapilandirilabilir TUM
 * tipleri tasir (dogum gunu haric) ve kaydedilmemis tipler acik doner; istemcinin
 * varsayilani bilmesi gerekmez.
 */
export interface NotificationSettings {
  /** Cihaza push gonderilsin mi. Uygulama ici bildirimleri etkilemez. */
  pushEnabled: boolean;
  preferences: NotificationPreference[];
}

/** Kismi guncelleme: yalnizca gonderilen alanlar uygulanir. */
export interface NotificationSettingsForUpdate {
  pushEnabled?: boolean;
  preferences?: NotificationPreference[];
}
