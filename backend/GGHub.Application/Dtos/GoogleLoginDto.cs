namespace GGHub.Application.Dtos
{
    public class GoogleLoginDto
    {
        // Google ID token (JWT). Used by the mobile app / One Tap.
        public string? IdToken { get; set; }

        // Google OAuth access token. Used by the custom web button (implicit flow).
        public string? AccessToken { get; set; }
    }
}
