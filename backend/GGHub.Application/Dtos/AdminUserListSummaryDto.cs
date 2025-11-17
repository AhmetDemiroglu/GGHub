using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class AdminUserListSummaryDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public ListVisibilitySetting Visibility { get; set; }
        public int FollowerCount { get; set; }
        public int GameCount { get; set; }
        public double AverageRating { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}