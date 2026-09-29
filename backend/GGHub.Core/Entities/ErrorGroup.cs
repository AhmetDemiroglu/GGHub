using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Ayni hatanin tum tekrarlari TEK satir. Admin panelindeki hata listesi bu tablodan okunur;
    /// tekil olaylarin ayrintisi (stack, kullanici, yol) ErrorEvent'te.
    ///
    /// Gruplama anahtari Fingerprint: kaynak + exception tipi + ilk GGHub stack satiri + metot +
    /// rota SABLONU. Rota sablon oldugu icin /api/userlistcomments/2 ile /3 ayni gruba duser.
    /// </summary>
    public class ErrorGroup
    {
        public int Id { get; set; }

        public string Fingerprint { get; set; } = null!;
        public ErrorSource Source { get; set; }

        public string ExceptionType { get; set; } = null!;

        /// <summary>Son gorulen olayin mesaji (mesaj icinde kimlik gecebildigi icin gruplamaya girmez).</summary>
        public string Message { get; set; } = null!;

        /// <summary>Logu yazan sinif (Serilog SourceContext); middleware yakaladiysa null.</summary>
        public string? Logger { get; set; }

        public string? Method { get; set; }
        public string? RouteTemplate { get; set; }
        public int? StatusCode { get; set; }

        public int Count { get; set; }
        public DateTime FirstSeenAt { get; set; }
        public DateTime LastSeenAt { get; set; }

        public ErrorGroupStatus Status { get; set; } = ErrorGroupStatus.Open;
        public DateTime? ResolvedAt { get; set; }

        /// <summary>Adminlere en son ne zaman bildirildi (grup basina bildirim freni).</summary>
        public DateTime? LastNotifiedAt { get; set; }

        public string? Note { get; set; }

        public ICollection<ErrorEvent> Events { get; set; } = new List<ErrorEvent>();
    }
}
