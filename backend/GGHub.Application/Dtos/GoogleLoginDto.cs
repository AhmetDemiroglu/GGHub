namespace GGHub.Application.Dtos
{
    public class GoogleLoginDto
    {
        // Google ID token (JWT) — used by the mobile app / One Tap.
        public string? IdToken { get; set; }

        // Google OAuth access token — used by the custom web button (implicit flow).
        public string? AccessToken { get; set; }
    }
}
