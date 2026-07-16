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
        ListRating
    }
}