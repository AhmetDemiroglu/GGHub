
namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Akis karti tipi. Istemci enum'lari bunu aynaliyor (web
    /// models/activity/activity.model.ts, mobil models/activity.ts), bu yuzden
    /// SONA eklenir, mevcut sayilar degismez.
    ///
    /// Mağazadaki eski mobil surumler ?type=0|1|2 gonderiyor ve bu dallar
    /// Post/Repost URETMEZ; dolayisiyla o surumler bilmedikleri bir tiple
    /// karsilasip bos kart cizmiyorlar (FeedCard'daki "default: return null").
    /// </summary>
    public enum ActivityType
    {
        Review = 0,
        ListCreated = 1,
        FollowUser = 2,
        Post = 3,
        Repost = 4
    }

    public class ActivityDto
    {
        public int Id { get; set; }
        public ActivityType Type { get; set; }
        public DateTime OccurredAt { get; set; }

        // Aktiviteyi yapan kullanıcı (kişisel feed'de kartın kimden geldiğini gösterir).
        public UserDto? Actor { get; set; }

        public ReviewActivityDto? ReviewData { get; set; }
        public ListActivityDto? ListData { get; set; }
        public UserDto? FollowData { get; set; }

        /// <summary>
        /// Gonderi ve repost kartlarinin verisi. Repost'ta PostData.RepostOf
        /// kaynak gonderiyi tasir, Actor ise repost EDEN kisidir.
        /// </summary>
        public PostDto? PostData { get; set; }
    }

    public class ReviewActivityDto
    {
        public int ReviewId { get; set; }
        public int Rating { get; set; }
        public string? ContentSnippet { get; set; }
        public GameSummaryDto Game { get; set; } = null!;

        // X tarzı kart göstergeleri
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        /// <summary>İsteği yapan kullanıcının bu incelemeye oyu (1/-1/null). Kalp toggle'ı için.</summary>
        public int? MyVote { get; set; }
    }

    public class ListActivityDto
    {
        public int ListId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int GameCount { get; set; }
        public List<string?> PreviewImages { get; set; } = new();
    }
}