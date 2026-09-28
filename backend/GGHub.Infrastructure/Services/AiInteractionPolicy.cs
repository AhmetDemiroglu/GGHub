using GGHub.Application.Exceptions;
using GGHub.Application.Interfaces;
using GGHub.Core.Specifications;
using GGHub.Core.Utilities;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    /// <inheritdoc />
    public class AiInteractionPolicy : IAiInteractionPolicy
    {
        private readonly GGHubDbContext _context;

        public AiInteractionPolicy(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CanInteractAsync(int userId, CancellationToken cancellationToken = default)
        {
            var u = await LoadAsync(userId, cancellationToken);
            return u is not null && AiInteractionRules.IsEligible(
                u.IsAiAgent, u.IsDeleted, u.IsBanned, u.AllowAiInteraction, u.DateOfBirth, BirthdayCalendar.TodayInIstanbul());
        }

        public async Task<string?> GetBlockReasonAsync(int userId, CancellationToken cancellationToken = default)
        {
            var u = await LoadAsync(userId, cancellationToken);
            if (u is null) return AiInteractionBlockReasons.ConsentRequired;
            return AiInteractionRules.BlockReason(u.AllowAiInteraction, u.DateOfBirth, BirthdayCalendar.TodayInIstanbul());
        }

        public async Task EnsureCanWriteToAgentsAsync(int userId, CancellationToken cancellationToken = default)
        {
            var u = await LoadAsync(userId, cancellationToken);
            if (u is { IsAiAgent: true }) return;

            var reason = u is null
                ? AiInteractionBlockReasons.ConsentRequired
                : AiInteractionRules.BlockReason(u.AllowAiInteraction, u.DateOfBirth, BirthdayCalendar.TodayInIstanbul());
            if (reason is null) return;

            throw new AiConsentRequiredException(reason, AppText.Get(reason switch
            {
                AiInteractionBlockReasons.NeedsBirthDate => "ai.needsBirthDate",
                AiInteractionBlockReasons.Underage => "ai.underage",
                _ => "ai.consentRequired"
            }));
        }

        public async Task EnsureCanMentionAgentsAsync(int userId, string? content, CancellationToken cancellationToken = default)
        {
            var handles = MentionService.ExtractHandles(content);
            if (handles.Count == 0) return;

            var normalized = handles.Select(UsernameNormalizer.Normalize).ToList();
            var mentionsAgent = await _context.Users.AsNoTracking()
                .AnyAsync(u => u.IsAiAgent && normalized.Contains(u.UsernameNormalized), cancellationToken);
            if (mentionsAgent) await EnsureCanWriteToAgentsAsync(userId, cancellationToken);
        }

        private Task<UserFacts?> LoadAsync(int userId, CancellationToken cancellationToken)
            => _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new UserFacts(u.IsAiAgent, u.IsDeleted, u.IsBanned, u.AllowAiInteraction, u.DateOfBirth))
                .FirstOrDefaultAsync(cancellationToken);

        private sealed record UserFacts(bool IsAiAgent, bool IsDeleted, bool IsBanned, bool AllowAiInteraction, DateTime? DateOfBirth);
    }
}
