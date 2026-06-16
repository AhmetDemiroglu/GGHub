namespace GGHub.Application.Dtos
{
    public class GoogleLoginDto
    {
        // Google ID token (JWT) obtained on the client via Google Sign-In.
        public string IdToken { get; set; }
    }
}
