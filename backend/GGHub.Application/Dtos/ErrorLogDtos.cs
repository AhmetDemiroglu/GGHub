namespace GGHub.Application.Dtos
{
    public class ErrorLogQueryParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;

        /// <summary>open | resolved | ignored | all (varsayilan open).</summary>
        public string? Status { get; set; }

        /// <summary>api | job | bot.</summary>
        public string? Source { get; set; }

        /// <summary>Mesaj, hata tipi ya da rota icinde arar.</summary>
        public string? Search { get; set; }

        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
    }

    public class ErrorGroupDto
    {
        public int Id { get; set; }
        public string Source { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string ExceptionType { get; set; } = null!;
        public string Message { get; set; } = null!;
        public string? Logger { get; set; }
        public string? Method { get; set; }
        public string? RouteTemplate { get; set; }
        public int? StatusCode { get; set; }
        public int Count { get; set; }
        public DateTime FirstSeenAt { get; set; }
        public DateTime LastSeenAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string? Note { get; set; }
    }

    public class ErrorEventDto
    {
        public long Id { get; set; }
        public DateTime OccurredAt { get; set; }
        public string Message { get; set; } = null!;
        public string? StackTrace { get; set; }
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

    public class ErrorGroupDetailDto : ErrorGroupDto
    {
        /// <summary>Son olaylar, yeniden eskiye.</summary>
        public List<ErrorEventDto> Events { get; set; } = new();
    }

    public class ErrorGroupStatusUpdateDto
    {
        /// <summary>open | resolved | ignored.</summary>
        public string Status { get; set; } = null!;
        public string? Note { get; set; }
    }

    public class ErrorLogSummaryDto
    {
        /// <summary>Durumu acik olan hata grubu sayisi.</summary>
        public int OpenGroups { get; set; }

        /// <summary>Son 24 saatte en az bir kez gorulen (yok sayilanlar haric) grup sayisi.</summary>
        public int GroupsLast24h { get; set; }

        /// <summary>Son 24 saatte ILK kez gorulen grup sayisi.</summary>
        public int NewGroupsLast24h { get; set; }

        public DateTime? LastErrorAt { get; set; }
    }
}
