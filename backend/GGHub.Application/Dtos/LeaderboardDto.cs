namespace GGHub.Application.Dtos.Home
{
    public class LeaderboardDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public int Level { get; set; }
        public int Xp { get; set; }
        public string LevelName { get; set; } = string.Empty;
        public int RankChange { get; set; }
    }
}