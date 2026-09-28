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

        /// <summary>AI bot hesabi; istemci kullanici adinin yanina "AI" rozeti basar. UserDtoEnricher doldurur.</summary>
        public bool IsAiAgent { get; set; }
    }
}