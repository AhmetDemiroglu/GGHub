namespace GGHub.Application.Dtos.Home
{
    public class HomeViewModel
    {
        public List<HomeGameDto> HeroGames { get; set; } = new();
        public List<HomeGameDto> TrendingLocal { get; set; } = new();
        public List<HomeGameDto> NewReleases { get; set; } = new();
        public List<LeaderboardDto> TopGamers { get; set; } = new();
    }
}