namespace GGHub.Application.Dtos
{
    public class BlockedUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public DateTime BlockedAt { get; set; }
    }
}