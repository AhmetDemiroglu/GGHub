namespace GGHub.Application.Dtos
{
    public class ProfileForUpdateDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Status { get; set; }
        public string? PhoneNumber { get; set; }
        public bool IsEmailPublic { get; set; }
        public bool IsPhoneNumberPublic { get; set; }
    }
}