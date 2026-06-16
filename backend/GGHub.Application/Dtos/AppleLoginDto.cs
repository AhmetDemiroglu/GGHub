namespace GGHub.Application.Dtos
{
    public class AppleLoginDto
    {
        // Apple identity token (JWT) returned by Sign in with Apple.
        public string IdentityToken { get; set; }

        // Apple returns the user's full name only on the FIRST authorization; the client forwards it.
        public string? FullName { get; set; }

        // Optional raw nonce; if provided we verify SHA256(nonce) == token nonce claim.
        public string? Nonce { get; set; }
    }
}
