namespace GGHub.Application.Dtos
{
    public class ReviewDto
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public int Rating { get; set; }
        public DateTime CreatedAt { get; set; }
        public UserDto User { get; set; }
        public int? CurrentUserVote { get; set; }
        public int VoteScore { get; set; }
        /// <summary>Yalnızca pozitif oy sayısı (feed kalbiyle aynı semantik).</summary>
        public int LikeCount { get; set; }
        public int CommentCount { get; set; }
        public GameSummaryDto? Game { get; set; }
    }
}