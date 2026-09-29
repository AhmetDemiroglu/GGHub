namespace GGHub.Core.Entities
{
    /// <summary>
    /// Bir hatanin tek bir gorulmesi. Istek GOVDESI asla yazilmaz (sifre, mesaj metni);
    /// query string hassas anahtarlari maskelenmis halde gelir.
    ///
    /// UserId BILEREK FK degil: kullanici silinse de hata kaydi kalmali, log yazimi da
    /// baska bir tablonun durumuna bagli olmamali.
    /// </summary>
    public class ErrorEvent
    {
        public long Id { get; set; }

        public int ErrorGroupId { get; set; }
        public ErrorGroup ErrorGroup { get; set; } = null!;

        public DateTime OccurredAt { get; set; }

        public string Message { get; set; } = null!;
        public string? StackTrace { get; set; }

        /// <summary>Ic exception zinciri: "Tip: mesaj" satirlari, distan ice.</summary>
        public string? InnerChain { get; set; }

        public string? Method { get; set; }
        public string? Path { get; set; }
        public string? QueryString { get; set; }
        public int? StatusCode { get; set; }

        public int? UserId { get; set; }
        public string? Username { get; set; }
        public string? UserAgent { get; set; }
        public string? Locale { get; set; }
        public string? TraceId { get; set; }
        public string? Environment { get; set; }
    }
}
