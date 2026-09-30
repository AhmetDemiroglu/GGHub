using GGHub.Core.Utilities;
using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ErrorLogService : IErrorLogService
    {
        private const int DetailEventCount = 20;

        private readonly GGHubDbContext _context;

        public ErrorLogService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task<PaginatedResult<ErrorGroupDto>> GetGroupsAsync(ErrorLogQueryParams query, CancellationToken cancellationToken = default)
        {
            var page = Math.Max(1, query.Page);
            var pageSize = Math.Clamp(query.PageSize, 1, 100);

            var groups = _context.ErrorGroups.AsNoTracking();

            var status = ParseStatus(query.Status, fallback: ErrorGroupStatus.Open, allowAll: true);
            if (status.HasValue) groups = groups.Where(g => g.Status == status.Value);

            if (Enum.TryParse<ErrorSource>(query.Source, ignoreCase: true, out var source) && Enum.IsDefined(source))
            {
                groups = groups.Where(g => g.Source == source);
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                // ILike: ToLower().Contains() Turkce kulturde buyuk I iceren aramayi sessizce bos dondurur.
                var pattern = $"%{query.Search.Trim()}%";
                groups = groups.Where(g =>
                    EF.Functions.ILike(g.Message, pattern) ||
                    EF.Functions.ILike(g.ExceptionType, pattern) ||
                    (g.RouteTemplate != null && EF.Functions.ILike(g.RouteTemplate, pattern)) ||
                    (g.Logger != null && EF.Functions.ILike(g.Logger, pattern)));
            }

            if (query.From.HasValue)
            {
                var from = DateTime.SpecifyKind(query.From.Value, DateTimeKind.Utc);
                groups = groups.Where(g => g.LastSeenAt >= from);
            }
            if (query.To.HasValue)
            {
                var to = DateTime.SpecifyKind(query.To.Value, DateTimeKind.Utc);
                groups = groups.Where(g => g.FirstSeenAt <= to);
            }

            var totalCount = await groups.CountAsync(cancellationToken);
            var rows = await groups
                .OrderByDescending(g => g.LastSeenAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return new PaginatedResult<ErrorGroupDto>
            {
                Items = rows.Select(g => Map(g, new ErrorGroupDto())).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<ErrorGroupDetailDto?> GetGroupAsync(int id, CancellationToken cancellationToken = default)
        {
            var group = await _context.ErrorGroups.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
            if (group is null) return null;

            var detail = (ErrorGroupDetailDto)Map(group, new ErrorGroupDetailDto());
            detail.Events = await _context.ErrorEvents.AsNoTracking()
                .Where(e => e.ErrorGroupId == id)
                .OrderByDescending(e => e.OccurredAt)
                .Take(DetailEventCount)
                .Select(e => new ErrorEventDto
                {
                    Id = e.Id,
                    OccurredAt = e.OccurredAt,
                    Message = e.Message,
                    StackTrace = e.StackTrace,
                    InnerChain = e.InnerChain,
                    Method = e.Method,
                    Path = e.Path,
                    QueryString = e.QueryString,
                    StatusCode = e.StatusCode,
                    UserId = e.UserId,
                    Username = e.Username,
                    UserAgent = e.UserAgent,
                    Locale = e.Locale,
                    TraceId = e.TraceId,
                    Environment = e.Environment
                })
                .ToListAsync(cancellationToken);
            return detail;
        }

        public async Task<ErrorGroupDto?> UpdateStatusAsync(int id, ErrorGroupStatusUpdateDto dto, CancellationToken cancellationToken = default)
        {
            var status = ParseStatus(dto.Status, fallback: null, allowAll: false)
                ?? throw new ArgumentException("status: open | resolved | ignored");

            var group = await _context.ErrorGroups.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
            if (group is null) return null;

            group.Status = status;
            group.ResolvedAt = status == ErrorGroupStatus.Resolved ? DateTime.UtcNow : null;
            if (dto.Note is not null)
            {
                var note = dto.Note.Trim();
                group.Note = note.Length == 0 ? null : SafeText.Truncate(note, 1000);
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Map(group, new ErrorGroupDto());
        }

        public async Task<ErrorLogSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
        {
            var dayAgo = DateTime.UtcNow.AddHours(-24);
            var groups = _context.ErrorGroups.AsNoTracking();

            return new ErrorLogSummaryDto
            {
                OpenGroups = await groups.CountAsync(g => g.Status == ErrorGroupStatus.Open, cancellationToken),
                GroupsLast24h = await groups.CountAsync(g => g.Status != ErrorGroupStatus.Ignored && g.LastSeenAt >= dayAgo, cancellationToken),
                NewGroupsLast24h = await groups.CountAsync(g => g.FirstSeenAt >= dayAgo, cancellationToken),
                LastErrorAt = await groups
                    .Where(g => g.Status != ErrorGroupStatus.Ignored)
                    .OrderByDescending(g => g.LastSeenAt)
                    .Select(g => (DateTime?)g.LastSeenAt)
                    .FirstOrDefaultAsync(cancellationToken)
            };
        }

        public async Task<int> PurgeEventsOlderThanAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken)
        {
            var totalDeleted = 0;
            while (!cancellationToken.IsCancellationRequested)
            {
                var deleted = await _context.ErrorEvents
                    .Where(e => e.OccurredAt < cutoffUtc)
                    .OrderBy(e => e.Id)
                    .Take(batchSize)
                    .ExecuteDeleteAsync(cancellationToken);

                totalDeleted += deleted;
                if (deleted < batchSize) break;
            }
            return totalDeleted;
        }

        // ------------------------------------------------------------------

        /// <summary>"all" (yalniz allowAll ise) null doner = suzgec yok; taninmayan deger fallback.</summary>
        private static ErrorGroupStatus? ParseStatus(string? raw, ErrorGroupStatus? fallback, bool allowAll)
        {
            if (string.IsNullOrWhiteSpace(raw)) return fallback;
            if (allowAll && raw.Equals("all", StringComparison.OrdinalIgnoreCase)) return null;
            return Enum.TryParse<ErrorGroupStatus>(raw, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed)
                ? parsed
                : fallback;
        }

        private static ErrorGroupDto Map(ErrorGroup group, ErrorGroupDto dto)
        {
            dto.Id = group.Id;
            dto.Source = group.Source.ToString().ToLowerInvariant();
            dto.Status = group.Status.ToString().ToLowerInvariant();
            dto.ExceptionType = group.ExceptionType;
            dto.Message = group.Message;
            dto.Logger = group.Logger;
            dto.Method = group.Method;
            dto.RouteTemplate = group.RouteTemplate;
            dto.StatusCode = group.StatusCode;
            dto.Count = group.Count;
            dto.FirstSeenAt = group.FirstSeenAt;
            dto.LastSeenAt = group.LastSeenAt;
            dto.ResolvedAt = group.ResolvedAt;
            dto.Note = group.Note;
            return dto;
        }
    }
}
