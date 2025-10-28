using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class UserListDetailDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public ListVisibilitySetting Visibility { get; set; }
        public ListCategory Category { get; set; } 
        public DateTime UpdatedAt { get; set; }
        public List<GameSummaryDto> Games { get; set; } = new List<GameSummaryDto>();
        public int GameCount { get; set; }
        public int FollowerCount { get; set; }
        public int RatingCount { get; set; }
        public double AverageRating { get; set; }
        public UserDto Owner { get; set; }
        public bool IsFollowing { get; set; }
    }
}