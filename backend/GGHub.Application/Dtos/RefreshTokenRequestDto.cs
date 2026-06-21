namespace GGHub.Application.Dtos
{
    public class RefreshTokenRequestDto
    {
        // Kanonik alan adı.
        public string? RefreshToken { get; set; }

        // Geriye dönük uyum: eski mobil build'ler ve web istemcisi "token" gönderiyordu.
        public string? Token { get; set; }
    }
}