namespace GGHub.Application.Dtos
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public bool IsFollowing { get; set; }
        public bool IsProfileAccessible { get; set; }
    }
}