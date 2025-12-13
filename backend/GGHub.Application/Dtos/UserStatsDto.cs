namespace GGHub.Application.Dtos.Stats
{
    public class UserStatsDto
    {
        public int TotalReviews { get; set; }
        public int TotalGamesListed { get; set; }
        public int TotalFollowers { get; set; }
        public int UserId { get; set; }
        public int CurrentLevel { get; set; }
        public string LevelName { get; set; }
        public int CurrentXp { get; set; }
        public int NextLevelXp { get; set; }
        public int ProgressPercentage { get; set; }
        public int TotalLists { get; set; }
        public List<string> RecentAchievements { get; set; } = new();
        public List<GenreStatDto> GamerDna { get; set; } = new(); 
    }

    public class GenreStatDto
    {
        public string Name { get; set; } = string.Empty;
        public int Percentage { get; set; }
        public string Color { get; set; } = string.Empty;
    }
}