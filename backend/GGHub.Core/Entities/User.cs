using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public byte[] PasswordHash { get; set; }
        public byte[] PasswordSalt { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public string Role { get; set; } = "User";
        public ICollection<Follow> Following { get; set; } = new List<Follow>();
        public ICollection<Follow> Followers { get; set; } = new List<Follow>();
        public ICollection<UserListFollow> FollowedLists { get; set; } = new List<UserListFollow>();
        public ICollection<Message> MessagesSent { get; set; } = new List<Message>();
        public ICollection<Message> MessagesReceived { get; set; } = new List<Message>();
        public ICollection<UserBlock> BlockedUsers { get; set; } = new List<UserBlock>();
        public ICollection<UserBlock> BlockedByUsers { get; set; } = new List<UserBlock>();
        public MessagePrivacySetting MessageSetting { get; set; } = MessagePrivacySetting.Everyone;
        public ProfileVisibilitySetting ProfileVisibility { get; set; } = ProfileVisibilitySetting.Public;
        public string? Status { get; set; }
        public string? PhoneNumber { get; set; }
        public bool IsEmailPublic { get; set; } = false; 
        public bool IsPhoneNumberPublic { get; set; } = false;
        public bool IsEmailVerified { get; set; } = false;
        public string? EmailVerificationToken { get; set; }
        public bool IsDateOfBirthPublic { get; set; } = false;
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiry { get; set; }
    }
}