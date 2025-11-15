namespace GGHub.Application.Dtos
{
    public class AdminUserDetailsDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public bool IsEmailVerified { get; set; }
        public bool IsBanned { get; set; }
        public DateTime? BannedAt { get; set; }
        public string? BanReason { get; set; }
    }
}