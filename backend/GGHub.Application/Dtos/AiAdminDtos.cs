namespace GGHub.Application.Dtos
{
    public class AiSettingsDto
    {
        public bool AgentsEnabled { get; set; }
        public decimal TranslationMonthlyBudgetTry { get; set; }
        public decimal AgentMonthlyBudgetTry { get; set; }
        public decimal UsdToTryRate { get; set; }
        public string PrimaryModel { get; set; } = string.Empty;
        public string FallbackModel { get; set; } = string.Empty;
        public int PrimaryModelRpm { get; set; }
        public int DailyActionsPerAgent { get; set; }
        public int MaxAgentMessagesPerUserPerDay { get; set; }
        public int MaxUnsolicitedDmPerUserPerWeek { get; set; }
        public int MaxAgentRepliesPerPost { get; set; }
        public int FeedMaxAiSharePercent { get; set; }
        public int ActiveFromHour { get; set; }
        public int ActiveToHour { get; set; }
        public DateTime UpdatedAt { get; set; }

        /// <summary>Salt okunur: sunucunun host kapisi (Railway env AiAgents__HostEnabled).</summary>
        public bool HostEnabled { get; set; }

        /// <summary>Salt okunur: fiyat tablosundaki bilinen modeller (secim listesi icin).</summary>
        public List<string> KnownModels { get; set; } = new();
    }

    public class AiAgentAdminDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public string? Bio { get; set; }
        public string PersonaKey { get; set; } = string.Empty;
        public string Persona { get; set; } = string.Empty;
        public string FavoriteGenres { get; set; } = string.Empty;
        public int RatingBias { get; set; }
        public int DailyActionQuota { get; set; }
        public bool IsEnabled { get; set; }
        public int FollowerCount { get; set; }
        public int PostCount { get; set; }
        public int ReviewCount { get; set; }
        public int TasksToday { get; set; }
        public DateTime? LastActivityAt { get; set; }
    }

    public class AiAgentUpdateDto
    {
        public bool IsEnabled { get; set; }
        public string Persona { get; set; } = string.Empty;
        public string FavoriteGenres { get; set; } = string.Empty;
        public int RatingBias { get; set; }
        public int DailyActionQuota { get; set; }
    }

    public class AiBudgetStatusDto
    {
        public string Source { get; set; } = string.Empty;
        public string PeriodKey { get; set; } = string.Empty;
        public decimal SpentTry { get; set; }
        public decimal LimitTry { get; set; }
        public decimal SpentUsd { get; set; }
        public decimal LimitUsd { get; set; }
        public int CallCount { get; set; }
        public long InputTokens { get; set; }
        public long OutputTokens { get; set; }
        public decimal SpentTodayTry { get; set; }
        public decimal DailyShareTry { get; set; }
    }

    public class AiUsageRowDto
    {
        public string Day { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int CallCount { get; set; }
        public long InputTokens { get; set; }
        public long OutputTokens { get; set; }
        public decimal SpentUsd { get; set; }
        public decimal SpentTry { get; set; }
    }

    public class AiTaskStatDto
    {
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class AiTaskLogDto
    {
        public long Id { get; set; }
        public string AgentUsername { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? Model { get; set; }
        public int InputTokens { get; set; }
        public int OutputTokens { get; set; }
        public string? TargetUsername { get; set; }
        public string? ResultSummary { get; set; }
        public string? Error { get; set; }
    }

    public class AiUsageReportDto
    {
        public List<AiBudgetStatusDto> Budgets { get; set; } = new();
        public List<AiUsageRowDto> Daily { get; set; } = new();
        public List<AiTaskStatDto> TaskStats24h { get; set; } = new();
        public List<AiTaskLogDto> RecentTasks { get; set; } = new();
    }

    public class AiPurgeReportDto
    {
        public bool DryRun { get; set; }
        public Dictionary<string, int> Counts { get; set; } = new();
        public int AffectedGames { get; set; }
        public int AffectedPosts { get; set; }
        public int AffectedLists { get; set; }
    }

    public class AiPurgeRequestDto
    {
        /// <summary>Onay metni; "SİL" (ya da "SIL") olmali.</summary>
        public string Confirmation { get; set; } = string.Empty;
    }
}
