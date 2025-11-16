namespace GGHub.Application.Dtos
{
    public class TopUserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string? ProfileImageUrl { get; set; }
        public int FollowerCount { get; set; }
    }
}