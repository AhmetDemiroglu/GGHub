using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class ProfileDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Status { get; set; }
        public string? PhoneNumber { get; set; }
        public bool IsEmailPublic { get; set; }
        public bool IsPhoneNumberPublic { get; set; }
        public ProfileVisibilitySetting ProfileVisibility { get; set; }
        public bool IsDateOfBirthPublic { get; set; }
        public MessagePrivacySetting MessageSetting { get; set; }
        public bool IsFollowing { get; set; }
        public bool IsFollowedBy { get; set; }
        public int FollowerCount { get; set; }
        public int FollowingCount { get; set; }

    }
}
