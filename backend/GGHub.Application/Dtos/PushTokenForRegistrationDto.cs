namespace GGHub.Application.Dtos
{
    public class PushTokenForRegistrationDto
    {
        public string Token { get; set; }
        public string? Platform { get; set; }

        /// <summary>
        /// Uygulama içi dil ("tr" | "en-US"). İsteğe bağlı: gönderilmezse backend isteğin
        /// Accept-Language başlığından yakalar, dolayısıyla mevcut mobil sürümler de doğru
        /// dilde push alır.
        /// </summary>
        public string? Locale { get; set; }
    }
}
