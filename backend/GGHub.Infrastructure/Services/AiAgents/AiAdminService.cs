using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Persistence.Seeders;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Admin panelinin AI ekrani: ayarlar, botlar, Gemini sayaci ve sahte icerik temizligi.
    /// </summary>
    public class AiAdminService
    {
        public const string BotEmailDomain = "@ai.gghub.social";

        private readonly GGHubDbContext _context;
        private readonly IAiSettingsProvider _settings;
        private readonly IAiAgentDirectory _directory;
        private readonly IGeminiBudgetService _budget;
        private readonly DemoContentSeeder _seeder;
        private readonly GeminiSettings _gemini;
        private readonly AiAgentHostSettings _host;
        private readonly ILogger<AiAdminService> _logger;

        public AiAdminService(
            GGHubDbContext context,
            IAiSettingsProvider settings,
            IAiAgentDirectory directory,
            IGeminiBudgetService budget,
            DemoContentSeeder seeder,
            IOptions<GeminiSettings> gemini,
            IOptions<AiAgentHostSettings> host,
            ILogger<AiAdminService> logger)
        {
            _context = context;
            _settings = settings;
            _directory = directory;
            _budget = budget;
            _seeder = seeder;
            _gemini = gemini.Value;
            _host = host.Value;
            _logger = logger;
        }

        // ------------------------------------------------------------------ ayarlar

        public async Task<AiSettingsDto> GetSettingsAsync(CancellationToken ct)
            => ToDto(await _settings.GetAsync(ct));

        /// <exception cref="ArgumentException">Gecersiz deger (bilinmeyen model, negatif tavan...).</exception>
        public async Task<AiSettingsDto> UpdateSettingsAsync(AiSettingsDto dto, CancellationToken ct)
        {
            if (!_gemini.Models.ContainsKey(dto.PrimaryModel) || !_gemini.Models.ContainsKey(dto.FallbackModel))
                throw new ArgumentException("Model fiyat tablosunda yok. Bilinen modellerden birini seçin.");
            if (dto.TranslationMonthlyBudgetTry < 0 || dto.AgentMonthlyBudgetTry < 0)
                throw new ArgumentException("Bütçe tavanı negatif olamaz.");
            if (dto.UsdToTryRate <= 0)
                throw new ArgumentException("Kur sıfırdan büyük olmalı.");
            if (dto.ActiveFromHour is < 0 or > 23 || dto.ActiveToHour is < 0 or > 23)
                throw new ArgumentException("Saatler 0 ile 23 arasında olmalı.");

            var updated = await _settings.UpdateAsync(s =>
            {
                s.AgentsEnabled = dto.AgentsEnabled;
                s.TranslationMonthlyBudgetTry = dto.TranslationMonthlyBudgetTry;
                s.AgentMonthlyBudgetTry = dto.AgentMonthlyBudgetTry;
                s.UsdToTryRate = dto.UsdToTryRate;
                s.PrimaryModel = dto.PrimaryModel;
                s.FallbackModel = dto.FallbackModel;
                s.PrimaryModelRpm = Math.Clamp(dto.PrimaryModelRpm, 1, 60);
                s.DailyActionsPerAgent = Math.Clamp(dto.DailyActionsPerAgent, 0, 50);
                s.MaxAgentMessagesPerUserPerDay = Math.Clamp(dto.MaxAgentMessagesPerUserPerDay, 0, 200);
                s.MaxUnsolicitedDmPerUserPerWeek = Math.Clamp(dto.MaxUnsolicitedDmPerUserPerWeek, 0, 7);
                s.MaxAgentRepliesPerPost = Math.Clamp(dto.MaxAgentRepliesPerPost, 0, 10);
                s.FeedMaxAiSharePercent = Math.Clamp(dto.FeedMaxAiSharePercent, 0, 100);
                s.ActiveFromHour = dto.ActiveFromHour;
                s.ActiveToHour = dto.ActiveToHour;
            }, ct);

            _logger.LogInformation("[AiAgents] Ayarlar guncellendi. Motor: {Enabled}", updated.AgentsEnabled);
            return ToDto(updated);
        }

        private AiSettingsDto ToDto(AiSettings s) => new()
        {
            AgentsEnabled = s.AgentsEnabled,
            TranslationMonthlyBudgetTry = s.TranslationMonthlyBudgetTry,
            AgentMonthlyBudgetTry = s.AgentMonthlyBudgetTry,
            UsdToTryRate = s.UsdToTryRate,
            PrimaryModel = s.PrimaryModel,
            FallbackModel = s.FallbackModel,
            PrimaryModelRpm = s.PrimaryModelRpm,
            DailyActionsPerAgent = s.DailyActionsPerAgent,
            MaxAgentMessagesPerUserPerDay = s.MaxAgentMessagesPerUserPerDay,
            MaxUnsolicitedDmPerUserPerWeek = s.MaxUnsolicitedDmPerUserPerWeek,
            MaxAgentRepliesPerPost = s.MaxAgentRepliesPerPost,
            FeedMaxAiSharePercent = s.FeedMaxAiSharePercent,
            ActiveFromHour = s.ActiveFromHour,
            ActiveToHour = s.ActiveToHour,
            UpdatedAt = s.UpdatedAt,
            HostEnabled = _host.HostEnabled,
            KnownModels = _gemini.Models.Keys.OrderBy(k => k).ToList()
        };

        // ------------------------------------------------------------------ botlar

        public async Task<List<AiAgentAdminDto>> GetAgentsAsync(CancellationToken ct)
        {
            var since = DateTime.UtcNow.AddHours(-24);
            return await _context.AiAgentProfiles.AsNoTracking()
                .OrderBy(p => p.User.Username)
                .Select(p => new AiAgentAdminDto
                {
                    UserId = p.UserId,
                    Username = p.User.Username,
                    DisplayName = p.User.FirstName ?? p.User.Username,
                    ProfileImageUrl = p.User.ProfileImageUrl,
                    Bio = p.User.Bio,
                    PersonaKey = p.PersonaKey,
                    Persona = p.Persona,
                    FavoriteGenres = p.FavoriteGenres,
                    RatingBias = p.RatingBias,
                    DailyActionQuota = p.DailyActionQuota,
                    IsEnabled = p.IsEnabled,
                    FollowerCount = _context.Follows.Count(f => f.FolloweeId == p.UserId),
                    PostCount = _context.Posts.Count(x => x.UserId == p.UserId),
                    ReviewCount = _context.Reviews.Count(r => r.UserId == p.UserId),
                    TasksToday = _context.AiAgentTasks.Count(t => t.AgentUserId == p.UserId && t.CreatedAt >= since),
                    LastActivityAt = _context.AiAgentTasks
                        .Where(t => t.AgentUserId == p.UserId && t.Status == AiAgentTaskStatus.Done)
                        .Max(t => (DateTime?)t.CompletedAt)
                })
                .ToListAsync(ct);
        }

        /// <summary>
        /// AiAgentPersonas listesindeki eksik botlari acar. Var olan (PersonaKey'i kayitli) atlanir.
        /// Bot hesaplarinin sifresi ve OAuth kimligi YOK; AuthService ayrica girisi reddeder.
        /// </summary>
        public async Task<int> ProvisionAgentsAsync(CancellationToken ct)
        {
            var existingKeys = await _context.AiAgentProfiles.Select(p => p.PersonaKey).ToListAsync(ct);
            var created = 0;

            foreach (var persona in AiAgentPersonas.All.Where(p => !existingKeys.Contains(p.Key)))
            {
                var username = persona.Username;
                for (var i = 2; await _context.Users.AnyAsync(u => u.UsernameNormalized == UsernameNormalizer.Normalize(username), ct); i++)
                {
                    username = persona.Username.Replace("_ai", $"{i}_ai");
                }

                var user = new User
                {
                    Username = username,
                    UsernameNormalized = UsernameNormalizer.Normalize(username),
                    Email = $"{username.ToLowerInvariant()}{BotEmailDomain}",
                    FirstName = persona.DisplayName,
                    Bio = persona.Bio,
                    ProfileImageUrl = AiAgentPersonas.AvatarUrl(username),
                    IsEmailVerified = true,
                    IsAiAgent = true,
                    AllowAiInteraction = false,
                    MessageSetting = MessagePrivacySetting.Everyone,
                    ProfileVisibility = ProfileVisibilitySetting.Public,
                    PostVisibility = PostVisibilitySetting.Everyone,
                    PostReplyPermission = PostReplyPermissionSetting.Everyone,
                    PreferredLocale = "tr",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync(ct);

                _context.AiAgentProfiles.Add(new AiAgentProfile
                {
                    UserId = user.Id,
                    PersonaKey = persona.Key,
                    Persona = persona.Character,
                    FavoriteGenres = persona.Genres,
                    RatingBias = persona.RatingBias,
                    DailyActionQuota = 0,
                    IsEnabled = true
                });
                _context.UserStats.Add(new UserStats { UserId = user.Id });
                await _context.SaveChangesAsync(ct);
                created++;
            }

            if (created > 0)
            {
                _directory.Invalidate();
                _logger.LogInformation("[AiAgents] {Count} bot olusturuldu.", created);
            }
            return created;
        }

        public async Task<bool> UpdateAgentAsync(int userId, AiAgentUpdateDto dto, CancellationToken ct)
        {
            var profile = await _context.AiAgentProfiles.FirstOrDefaultAsync(p => p.UserId == userId, ct);
            if (profile is null) return false;
            if (string.IsNullOrWhiteSpace(dto.Persona)) throw new ArgumentException("Persona boş olamaz.");

            profile.IsEnabled = dto.IsEnabled;
            profile.Persona = dto.Persona.Trim().Length > 2000 ? dto.Persona.Trim()[..2000] : dto.Persona.Trim();
            profile.FavoriteGenres = (dto.FavoriteGenres ?? string.Empty).Trim();
            profile.RatingBias = Math.Clamp(dto.RatingBias, -2, 2);
            profile.DailyActionQuota = Math.Clamp(dto.DailyActionQuota, 0, 50);
            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);

            if (!dto.IsEnabled)
            {
                await _context.AiAgentTasks
                    .Where(t => t.AgentUserId == userId && t.Status == AiAgentTaskStatus.Pending)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(t => t.Status, AiAgentTaskStatus.Skipped)
                        .SetProperty(t => t.Error, "Bot kapatildi."), ct);
            }
            return true;
        }

        // ------------------------------------------------------------------ sayac

        public async Task<AiUsageReportDto> GetUsageAsync(int days, CancellationToken ct)
        {
            days = Math.Clamp(days, 1, 90);
            var settings = await _settings.GetAsync(ct);
            var rate = settings.UsdToTryRate > 0 ? settings.UsdToTryRate : 1m;
            var fromKey = DateTime.UtcNow.AddDays(-(days - 1)).ToString("yyyy-MM-dd");

            var report = new AiUsageReportDto();

            foreach (var source in new[] { GeminiSources.Translation, GeminiSources.AiAgent })
            {
                var st = await _budget.GetStatusAsync(source, ct);
                report.Budgets.Add(new AiBudgetStatusDto
                {
                    Source = source,
                    PeriodKey = st.PeriodKey,
                    SpentUsd = st.SpentUsd,
                    LimitUsd = st.LimitUsd,
                    SpentTry = Math.Round(st.SpentTry, 2),
                    LimitTry = Math.Round(st.LimitTry, 2),
                    CallCount = st.CallCount,
                    InputTokens = st.InputTokens,
                    OutputTokens = st.OutputTokens,
                    SpentTodayTry = Math.Round(st.SpentTodayUsd * st.UsdToTryRate, 2),
                    DailyShareTry = Math.Round(st.DailyShareUsd * st.UsdToTryRate, 2)
                });
            }

            var rows = await _context.GeminiUsages.AsNoTracking()
                .Where(u => string.Compare(u.PeriodKey, fromKey) >= 0 && u.PeriodKey.Length == 10)
                .OrderByDescending(u => u.PeriodKey).ThenBy(u => u.Source).ThenBy(u => u.Model)
                .ToListAsync(ct);
            report.Daily = rows.Select(u => new AiUsageRowDto
            {
                Day = u.PeriodKey,
                Source = u.Source,
                Model = u.Model,
                CallCount = u.CallCount,
                InputTokens = u.InputTokens,
                OutputTokens = u.OutputTokens,
                SpentUsd = u.SpentUsd,
                SpentTry = Math.Round(u.SpentUsd * rate, 4)
            }).ToList();

            var since = DateTime.UtcNow.AddHours(-24);
            var stats = await _context.AiAgentTasks.AsNoTracking()
                .Where(t => t.CreatedAt >= since)
                .GroupBy(t => new { t.Type, t.Status })
                .Select(g => new { g.Key.Type, g.Key.Status, Count = g.Count() })
                .ToListAsync(ct);
            report.TaskStats24h = stats
                .Select(x => new AiTaskStatDto { Type = x.Type.ToString(), Status = x.Status.ToString(), Count = x.Count })
                .OrderBy(x => x.Type).ThenBy(x => x.Status)
                .ToList();

            var recent = await _context.AiAgentTasks.AsNoTracking()
                .OrderByDescending(t => t.CompletedAt ?? t.ScheduledAt)
                .Take(60)
                .Select(t => new
                {
                    t.Id, t.AgentUser.Username, t.Type, t.Status, t.ScheduledAt, t.CompletedAt,
                    t.Model, t.InputTokens, t.OutputTokens, t.TargetUserId, t.ResultSummary, t.Error
                })
                .ToListAsync(ct);
            var targetIds = recent.Where(r => r.TargetUserId.HasValue).Select(r => r.TargetUserId!.Value).Distinct().ToList();
            var targetNames = await _context.Users.AsNoTracking()
                .Where(u => targetIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.Username, ct);

            report.RecentTasks = recent.Select(r => new AiTaskLogDto
            {
                Id = r.Id,
                AgentUsername = r.Username,
                Type = r.Type.ToString(),
                Status = r.Status.ToString(),
                ScheduledAt = r.ScheduledAt,
                CompletedAt = r.CompletedAt,
                Model = r.Model,
                InputTokens = r.InputTokens,
                OutputTokens = r.OutputTokens,
                TargetUsername = r.TargetUserId.HasValue ? targetNames.GetValueOrDefault(r.TargetUserId.Value) : null,
                ResultSummary = r.ResultSummary,
                Error = r.Error
            }).ToList();

            return report;
        }

        // ------------------------------------------------------------------ temizlik

        public async Task<AiPurgeReportDto> PurgeFakeContentAsync(bool dryRun, CancellationToken ct)
        {
            var report = await _seeder.PurgeFakeContentAsync(includeLegacyFakeAccounts: true, dryRun, ct);
            if (!dryRun)
            {
                _logger.LogWarning("[Admin] Sahte icerik temizlendi: {Counts}",
                    string.Join(", ", report.Counts.Select(kv => $"{kv.Key}={kv.Value}")));
            }
            return new AiPurgeReportDto
            {
                DryRun = report.DryRun,
                Counts = report.Counts,
                AffectedGames = report.AffectedGames,
                AffectedPosts = report.AffectedPosts,
                AffectedLists = report.AffectedLists
            };
        }
    }
}
