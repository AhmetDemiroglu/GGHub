namespace GGHub.Application.Dtos
{
    public class TopGameDto
    {
        public int GameId { get; set; }
        public string GameName { get; set; }
        public string? GameImageUrl { get; set; } 
        public double AverageRating { get; set; }
        public int ReviewCount { get; set; }
    }
}