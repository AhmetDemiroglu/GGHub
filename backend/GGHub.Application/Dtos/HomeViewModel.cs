namespace GGHub.Application.Dtos.Home
{
    public class HomeViewModel
    {
        public List<HomeGameDto> HeroGames { get; set; } = new();
        public List<HomeGameDto> TrendingLocal { get; set; } = new();
        public List<HomeGameDto> NewReleases { get; set; } = new();
        public List<LeaderboardDto> TopGamers { get; set; } = new();
        public SiteStatsDto SiteStats { get; set; } = new();
    }

    public class SiteStatsDto
    {
        public int TotalGames { get; set; }
        public int TotalUsers { get; set; }
        public int TotalReviews { get; set; }
        public int TotalLists { get; set; }
    }
}