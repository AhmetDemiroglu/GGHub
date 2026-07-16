namespace GGHub.Core.Enums
{
    public enum NotificationType
    {
        Follow,
        ListFollow,
        Message,
        Review,
        // Append-only: mevcut degerlerin (0-3) sayilari sabit kalmali (istemci enum'lari ile uyum).
        ListComment,
        CommentReply,
        CommentLike,
        ListRating,
        // 8+ : inceleme yorumlari ve etiketleme. Yine SONA eklendi; eski mobil surumler
        // bilmedikleri tipte jenerik ikona duser (istemci haritalari fallback'li).
        // Tip kaba bir kategoridir (ikon/renk); asil metni Notification.MessageKey tasir,
        // bu yuzden "incelemede etiketlendin" ve "yorumda etiketlendin" tek Mention degeriyle
        // ifade edilir, enum sismez.
        ReviewComment,
        ReviewCommentReply,
        ReviewCommentLike,
        Mention
    }
}