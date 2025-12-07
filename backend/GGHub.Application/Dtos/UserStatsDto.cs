namespace GGHub.Application.Dtos.Stats
{
    public class UserStatsDto
    {
        public int TotalReviews { get; set; }
        public int TotalGamesListed { get; set; }
        public int TotalFollowers { get; set; }
        public List<GenreStatDto> GamerDna { get; set; } = new();
    }

    public class GenreStatDto
    {
        public string Name { get; set; } = string.Empty;
        public int Percentage { get; set; }
        public string Color { get; set; } = string.Empty;
    }
}