namespace GGHub.Core.Entities
{
    public class UserStats
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public int CurrentLevel { get; set; } = 1;
        public int CurrentXp { get; set; } = 0;
        public int TotalReviews { get; set; } = 0;
        public int TotalLists { get; set; } = 0;
        public int TotalComments { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}