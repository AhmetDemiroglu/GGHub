namespace GGHub.Application.Dtos
{
    public class UserListDetailDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public bool IsPublic { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<GameSummaryDto> Games { get; set; } = new List<GameSummaryDto>();
        public int GameCount { get; set; }
        public int FollowerCount { get; set; }
    }
}