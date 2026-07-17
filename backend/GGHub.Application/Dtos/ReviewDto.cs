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
        /// <summary>
        /// YALNIZCA kok yorumlar (ParentCommentId == null). Inceleme detayindaki
        /// "Yorumlar (n)" basligi da kok sayar (ReviewCommentService: liste
        /// ParentCommentId == null ile filtreli), iki sayac ayni seyi saymali.
        /// Eskiden burada r.Comments.Count vardi ve yanitlari da sayiyordu:
        /// 1 kok + 1 yanitli bir inceleme akista "2", detayda "1" gosteriyordu.
        /// </summary>
        public int CommentCount { get; set; }
        public GameSummaryDto? Game { get; set; }
    }
}