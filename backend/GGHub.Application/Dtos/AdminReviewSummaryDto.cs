namespace GGHub.Application.Dtos
{
    public class AdminReviewSummaryDto
    {
        public int Id { get; set; }
        public string GameName { get; set; }
        public int GameId { get; set; }
        public int Rating { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public int RawgId { get; set; }
        public string Slug { get; set; }
    }
}