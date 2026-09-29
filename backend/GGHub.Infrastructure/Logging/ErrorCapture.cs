using GGHub.Core.Enums;

namespace GGHub.Infrastructure.Logging
{
    /// <summary>
    /// Yakalama aninda istekten kopyalanan her sey. Kuyruga giren nesne HttpContext'e ya da
    /// exception'a referans TUTMAZ: yazici onu istek bittikten sonra, baska bir thread'de isler.
    /// </summary>
    public sealed record ErrorCapture
    {
        public required ErrorSource Source { get; init; }
        public required string ExceptionType { get; init; }
        public required string Message { get; init; }
        public string? Logger { get; init; }
        public string? StackTrace { get; init; }
        public string? InnerChain { get; init; }

        /// <summary>Gruplamaya giren stack satiri (ilk GGHub satiri, yoksa ilk satir).</summary>
        public string? TopFrame { get; init; }

        public string? Method { get; init; }
        public string? RouteTemplate { get; init; }
        public string? Path { get; init; }
        public string? QueryString { get; init; }
        public int? StatusCode { get; init; }

        public int? UserId { get; init; }
        public string? Username { get; init; }
        public string? UserAgent { get; init; }
        public string? Locale { get; init; }
        public string? TraceId { get; init; }
        public string? Environment { get; init; }

        public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
    }
}
