
namespace GGHub.Application.Dtos
{
    public enum ActivityType
    {
        Review = 0,
        ListCreated = 1,
        FollowUser = 2
    }

    public class ActivityDto
    {
        public int Id { get; set; } 
        public ActivityType Type { get; set; }
        public DateTime OccurredAt { get; set; }

        public ReviewActivityDto? ReviewData { get; set; }
        public ListActivityDto? ListData { get; set; }
        public UserDto? FollowData { get; set; }
    }

    public class ReviewActivityDto
    {
        public int ReviewId { get; set; }
        public int Rating { get; set; }
        public string? ContentSnippet { get; set; } 
        public GameSummaryDto Game { get; set; } = null!;
    }

    public class ListActivityDto
    {
        public int ListId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int GameCount { get; set; }
        public List<string?> PreviewImages { get; set; } = new();
    }
}