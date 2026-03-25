using GGHub.Core.Entities;
using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Systematic RAWG game import job. Runs ONLY in Development environment.
    /// Crawls RAWG API with multiple ordering strategies, prioritizes high-value games,
    /// filters junk, tracks checkpoints, and resumes from where it left off.
    /// </summary>
    public class RawgImportJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<RawgImportJob> _logger;
        private readonly IHostEnvironment _environment;
        private readonly RawgImportSettings _settings;
        private readonly RawgApiSettings _apiSettings;
        private readonly string _logFilePath;
        private readonly Encoding _utf8NoBom = new UTF8Encoding(false);

        // JSON serializer options that preserve Unicode (Turkce karakterler)
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            WriteIndented = false
        };

        public RawgImportJob(
            IServiceProvider serviceProvider,
            ILogger<RawgImportJob> logger,
            IHostEnvironment environment,
            IOptions<RawgImportSettings> settings,
            IOptions<RawgApiSettings> apiSettings)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _environment = environment;
            _settings = settings.Value;
            _apiSettings = apiSettings.Value;
            _logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rawg_import.txt");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // CRITICAL SAFETY: Never run in production
            if (!_environment.IsDevelopment())
            {
                _logger.LogWarning("[RawgImport] BLOCKED: This job only runs in Development. Current environment: {Env}", _environment.EnvironmentName);
                return;
            }

            if (!_settings.Enabled)
            {
                _logger.LogInformation("[RawgImport] Import job is disabled via configuration.");
                return;
            }

            Log("=== RAWG IMPORT JOB STARTED (Development only) ===");
            Log($"Config: PageSize={_settings.PageSize}, Delay={_settings.DelayBetweenRequestsMs}ms, MaxPages/Run={_settings.MaxPagesPerRun}, Interval={_settings.RunIntervalMinutes}min");
            Log($"Filters: MinRatingsCount={_settings.MinRatingsCount}, MinAdded={_settings.MinAdded}, MinRating={_settings.MinRating}");
            Log($"Strategies: {string.Join(", ", _settings.Strategies)}");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunImportCycleAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Log($"CRITICAL ERROR in import cycle: {ex.Message}", LogLevel.Error);
                    _logger.LogError(ex, "[RawgImport] Critical error in import cycle");
                }

                var interval = TimeSpan.FromMinutes(_settings.RunIntervalMinutes);
                Log($"Sleeping for {_settings.RunIntervalMinutes} minutes until next run...");
                await Task.Delay(interval, stoppingToken);
            }

            Log("=== RAWG IMPORT JOB STOPPED ===");
        }

        private async Task RunImportCycleAsync(CancellationToken ct)
        {
            // Double-check: refuse to run outside Development
            if (!_environment.IsDevelopment())
                return;

            Log("--- Import cycle started ---");

            foreach (var strategy in _settings.Strategies)
            {
                if (ct.IsCancellationRequested) break;

                await ProcessStrategyAsync(strategy, ct);
            }

            Log("--- Import cycle completed ---");
        }

        private async Task ProcessStrategyAsync(string ordering, CancellationToken ct)
        {
            var strategyKey = $"ordering:{ordering}";
            Log($"[Strategy: {strategyKey}] Starting...");

            RawgImportCheckpoint checkpoint;

            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                checkpoint = await context.RawgImportCheckpoints
                    .FirstOrDefaultAsync(c => c.StrategyKey == strategyKey, ct)
                    ?? new RawgImportCheckpoint { StrategyKey = strategyKey };

                if (checkpoint.Id == 0)
                {
                    context.RawgImportCheckpoints.Add(checkpoint);
                    await context.SaveChangesAsync(ct);
                }
            }

            if (checkpoint.IsCompleted)
            {
                Log($"[Strategy: {strategyKey}] Already completed (Page: {checkpoint.CurrentPage}, Added: {checkpoint.TotalAdded}). Skipping.");
                return;
            }

            Log($"[Strategy: {strategyKey}] Resuming from page {checkpoint.CurrentPage} (Added so far: {checkpoint.TotalAdded})");

            int pagesProcessed = 0;
            int consecutiveErrors = 0;

            while (pagesProcessed < _settings.MaxPagesPerRun && !ct.IsCancellationRequested)
            {
                var page = checkpoint.CurrentPage;

                var result = await FetchAndProcessPageAsync(strategyKey, ordering, page, ct);

                using (var scope = _serviceProvider.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

                    // Re-attach checkpoint from fresh context
                    var dbCheckpoint = await context.RawgImportCheckpoints
                        .FirstAsync(c => c.StrategyKey == strategyKey, ct);

                    if (result.Status == PageStatus.Success)
                    {
                        consecutiveErrors = 0;
                        dbCheckpoint.CurrentPage = page + 1;
                        dbCheckpoint.TotalProcessed += result.Processed;
                        dbCheckpoint.TotalAdded += result.Added;
                        dbCheckpoint.TotalSkipped += result.Skipped;
                        dbCheckpoint.TotalFiltered += result.Filtered;
                        dbCheckpoint.TotalDuplicate += result.Duplicate;
                        dbCheckpoint.TotalUpdated += result.Updated;
                        dbCheckpoint.LastRunAt = DateTime.UtcNow;
                        dbCheckpoint.LastError = null;

                        Log($"[Strategy: {strategyKey}] Page {page} OK: +{result.Added} added, {result.Duplicate} dup, {result.Filtered} filtered, {result.Skipped} skipped, {result.Updated} updated");
                        pagesProcessed++;
                    }
                    else if (result.Status == PageStatus.EndOfData)
                    {
                        dbCheckpoint.CurrentPage = page + 1;
                        dbCheckpoint.TotalProcessed += result.Processed;
                        dbCheckpoint.TotalAdded += result.Added;
                        dbCheckpoint.TotalSkipped += result.Skipped;
                        dbCheckpoint.TotalFiltered += result.Filtered;
                        dbCheckpoint.TotalDuplicate += result.Duplicate;
                        dbCheckpoint.TotalUpdated += result.Updated;
                        dbCheckpoint.IsCompleted = true;
                        dbCheckpoint.LastRunAt = DateTime.UtcNow;
                        dbCheckpoint.LastError = null;
                        await context.SaveChangesAsync(ct);

                        Log($"[Strategy: {strategyKey}] Page {page} OK (last page): +{result.Added} added, {result.Duplicate} dup, {result.Filtered} filtered");
                        Log($"[Strategy: {strategyKey}] COMPLETED. Total added: {dbCheckpoint.TotalAdded}, Total processed: {dbCheckpoint.TotalProcessed}");
                        return;
                    }
                    else if (result.Status == PageStatus.RateLimited)
                    {
                        dbCheckpoint.LastError = "Rate limited (429)";
                        dbCheckpoint.LastRunAt = DateTime.UtcNow;
                    }
                    else if (result.Status == PageStatus.ServerError)
                    {
                        dbCheckpoint.LastError = result.ErrorMessage;
                        dbCheckpoint.LastRunAt = DateTime.UtcNow;
                    }
                    else
                    {
                        dbCheckpoint.LastError = result.ErrorMessage;
                        dbCheckpoint.LastRunAt = DateTime.UtcNow;
                    }

                    await context.SaveChangesAsync(ct);

                    // Update local checkpoint reference for next iteration
                    checkpoint.CurrentPage = dbCheckpoint.CurrentPage;
                }

                // Log and handle backoff AFTER scope is disposed
                if (result.Status == PageStatus.RateLimited)
                {
                    Log($"[Strategy: {strategyKey}] Rate limited at page {page}. Backing off {_settings.RateLimitBackoffMs}ms...", LogLevel.Warning);
                    await Task.Delay(_settings.RateLimitBackoffMs, ct);
                    consecutiveErrors++;
                }
                else if (result.Status == PageStatus.ServerError)
                {
                    Log($"[Strategy: {strategyKey}] Server error at page {page}: {result.ErrorMessage}. Backing off {_settings.ServerErrorBackoffMs}ms...", LogLevel.Warning);
                    await Task.Delay(_settings.ServerErrorBackoffMs, ct);
                    consecutiveErrors++;
                }
                else if (result.Status == PageStatus.Error)
                {
                    Log($"[Strategy: {strategyKey}] Error at page {page}: {result.ErrorMessage}", LogLevel.Error);
                    consecutiveErrors++;
                }

                if (consecutiveErrors >= _settings.MaxConsecutiveErrors)
                {
                    Log($"[Strategy: {strategyKey}] Stopping after {consecutiveErrors} consecutive errors.", LogLevel.Warning);
                    return;
                }

                // Rate-limit friendly delay between requests
                if (!ct.IsCancellationRequested)
                {
                    await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
                }
            }

            Log($"[Strategy: {strategyKey}] Run limit reached ({pagesProcessed} pages). Will continue next cycle from page {checkpoint.CurrentPage}.");
        }

        private async Task<PageResult> FetchAndProcessPageAsync(string strategyKey, string ordering, int page, CancellationToken ct)
        {
            var url = $"{_apiSettings.BaseUrl}games?key={_apiSettings.ApiKey}&page={page}&page_size={_settings.PageSize}&ordering={ordering}";

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
                var httpClient = httpClientFactory.CreateClient();

                var response = await httpClient.GetAsync(url, ct);

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    return new PageResult { Status = PageStatus.RateLimited };
                }

                if ((int)response.StatusCode >= 500)
                {
                    return new PageResult
                    {
                        Status = PageStatus.ServerError,
                        ErrorMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                    };
                }

                if (!response.IsSuccessStatusCode)
                {
                    return new PageResult
                    {
                        Status = PageStatus.Error,
                        ErrorMessage = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                    };
                }

                var content = await response.Content.ReadAsStringAsync(ct);
                var data = JsonSerializer.Deserialize<PaginatedResponseDto<RawgGameDto>>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (data == null || !data.Results.Any())
                {
                    return new PageResult { Status = PageStatus.EndOfData };
                }

                // RAWG returns null for next when on the last page
                bool isLastPage = string.IsNullOrEmpty(data.Next);

                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                var result = await ProcessGamesAsync(context, data.Results, strategyKey, ct);

                if (isLastPage)
                {
                    result.Status = PageStatus.EndOfData;
                }

                return result;
            }
            catch (TaskCanceledException) when (ct.IsCancellationRequested)
            {
                throw; // Let the caller handle cancellation
            }
            catch (HttpRequestException ex)
            {
                return new PageResult
                {
                    Status = PageStatus.Error,
                    ErrorMessage = $"HttpRequestException: {ex.Message}"
                };
            }
            catch (Exception ex)
            {
                return new PageResult
                {
                    Status = PageStatus.Error,
                    ErrorMessage = $"Exception: {ex.Message}"
                };
            }
        }

        private async Task<PageResult> ProcessGamesAsync(
            GGHubDbContext context,
            IEnumerable<RawgGameDto> games,
            string strategyKey,
            CancellationToken ct)
        {
            var result = new PageResult { Status = PageStatus.Success };
            var gameList = games.ToList();

            // Get existing RawgIds in one query for batch duplicate check
            var rawgIds = gameList.Select(g => g.Id).Distinct().ToList();
            var existingGames = await context.Games
                .Where(g => rawgIds.Contains(g.RawgId))
                .ToDictionaryAsync(g => g.RawgId, ct);

            foreach (var dto in gameList)
            {
                result.Processed++;

                // 1. Junk filter
                var filterReason = GetFilterReason(dto);
                if (filterReason != null)
                {
                    result.Filtered++;
                    _logger.LogDebug("[RawgImport] FILTERED '{Name}' (RawgId: {Id}): {Reason}", dto.Name, dto.Id, filterReason);
                    continue;
                }

                // 2. Duplicate check
                if (existingGames.TryGetValue(dto.Id, out var existingGame))
                {
                    // Update RAWG metadata if we have newer data
                    bool updated = false;
                    if (existingGame.RawgRatingsCount != dto.RatingsCount && dto.RatingsCount > 0)
                    {
                        existingGame.RawgRatingsCount = dto.RatingsCount;
                        updated = true;
                    }
                    if (existingGame.RawgAdded != dto.Added && dto.Added > 0)
                    {
                        existingGame.RawgAdded = dto.Added;
                        updated = true;
                    }
                    if (existingGame.Rating != dto.Rating && dto.Rating.HasValue)
                    {
                        existingGame.Rating = dto.Rating;
                        updated = true;
                    }
                    if (existingGame.Metacritic == null && dto.Metacritic != null)
                    {
                        existingGame.Metacritic = dto.Metacritic;
                        updated = true;
                    }

                    if (updated)
                    {
                        result.Updated++;
                    }
                    else
                    {
                        result.Duplicate++;
                    }
                    continue;
                }

                // 3. Create new game
                var platforms = dto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList();
                var genres = dto.Genres?.Select(g => new { g.Name, g.Slug }).ToList();

                var newGame = new Game
                {
                    RawgId = dto.Id,
                    Name = dto.Name,
                    Slug = dto.Slug,
                    Released = dto.Released,
                    BackgroundImage = dto.BackgroundImage,
                    Rating = dto.Rating,
                    Metacritic = dto.Metacritic,
                    RawgRatingsCount = dto.RatingsCount,
                    RawgAdded = dto.Added,
                    ImportSource = strategyKey,
                    ImportedAt = DateTime.UtcNow,
                    LastSyncedAt = DateTime.UtcNow,
                    PlatformsJson = platforms != null ? JsonSerializer.Serialize(platforms, JsonOptions) : null,
                    GenresJson = genres != null ? JsonSerializer.Serialize(genres, JsonOptions) : null
                };

                try
                {
                    await context.Games.AddAsync(newGame, ct);
                    result.Added++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[RawgImport] Failed to add game '{Name}' (RawgId: {Id}): {Error}", dto.Name, dto.Id, ex.Message);
                    context.Entry(newGame).State = EntityState.Detached;
                    result.Skipped++;
                }
            }

            try
            {
                await context.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex)
            {
                // Handle race condition: some games may have been added by another process
                _logger.LogWarning("[RawgImport] DbUpdateException during batch save: {Message}. Falling back to individual saves.", ex.InnerException?.Message ?? ex.Message);

                // Detach all and try individual saves
                foreach (var entry in context.ChangeTracker.Entries<Game>()
                    .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified)
                    .ToList())
                {
                    entry.State = EntityState.Detached;
                }

                // Re-process individually
                result = new PageResult { Status = PageStatus.Success };
                foreach (var dto in gameList)
                {
                    result.Processed++;

                    var filterReason = GetFilterReason(dto);
                    if (filterReason != null) { result.Filtered++; continue; }

                    var exists = await context.Games.AnyAsync(g => g.RawgId == dto.Id, ct);
                    if (exists) { result.Duplicate++; continue; }

                    await SaveSingleGameAsync(context, dto, strategyKey, result, ct);
                }
            }

            return result;
        }

        private async Task SaveSingleGameAsync(GGHubDbContext context, RawgGameDto dto, string strategyKey, PageResult result, CancellationToken ct)
        {
            var platforms = dto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList();
            var genres = dto.Genres?.Select(g => new { g.Name, g.Slug }).ToList();

            var newGame = new Game
            {
                RawgId = dto.Id,
                Name = dto.Name,
                Slug = dto.Slug,
                Released = dto.Released,
                BackgroundImage = dto.BackgroundImage,
                Rating = dto.Rating,
                Metacritic = dto.Metacritic,
                RawgRatingsCount = dto.RatingsCount,
                RawgAdded = dto.Added,
                ImportSource = strategyKey,
                ImportedAt = DateTime.UtcNow,
                LastSyncedAt = DateTime.UtcNow,
                PlatformsJson = platforms != null ? JsonSerializer.Serialize(platforms, JsonOptions) : null,
                GenresJson = genres != null ? JsonSerializer.Serialize(genres, JsonOptions) : null
            };

            try
            {
                await context.Games.AddAsync(newGame, ct);
                await context.SaveChangesAsync(ct);
                result.Added++;
            }
            catch (DbUpdateException)
            {
                context.Entry(newGame).State = EntityState.Detached;
                result.Duplicate++;
            }
        }

        /// <summary>
        /// Returns a reason string if the game should be filtered out, or null if it should be imported.
        /// </summary>
        private string? GetFilterReason(RawgGameDto dto)
        {
            // TBA (to be announced) - not yet released, skip
            if (dto.Tba)
                return "TBA (not released)";

            // Very low engagement
            if (dto.RatingsCount < _settings.MinRatingsCount && dto.Added < _settings.MinAdded)
                return $"Low engagement (ratings_count={dto.RatingsCount}, added={dto.Added})";

            // Minimum rating filter (if configured)
            if (_settings.MinRating > 0 && dto.Rating.HasValue && dto.Rating.Value > 0 && dto.Rating.Value < _settings.MinRating)
                return $"Below min rating ({dto.Rating:F2} < {_settings.MinRating})";

            // Empty or null name
            if (string.IsNullOrWhiteSpace(dto.Name))
                return "Empty name";

            // Junk slug patterns
            var slugLower = dto.Slug?.ToLowerInvariant() ?? "";
            foreach (var pattern in _settings.JunkSlugPatterns)
            {
                if (slugLower.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                    return $"Junk slug pattern: '{pattern}'";
            }

            // Junk name patterns
            var nameLower = dto.Name.ToLowerInvariant();
            foreach (var pattern in _settings.JunkNamePatterns)
            {
                if (nameLower.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                    return $"Junk name pattern: '{pattern}'";
            }

            return null; // Passes all filters
        }

        /// <summary>
        /// Calculates a priority score for a game. Higher = more valuable.
        /// Used for future sorting/priority but currently for logging purposes.
        /// </summary>
        internal static double CalculatePriorityScore(RawgGameDto dto)
        {
            double score = 0;

            // Ratings count weight (most important signal of community engagement)
            score += Math.Min(dto.RatingsCount, 10000) * 0.003; // max 30 points

            // Added count weight
            score += Math.Min(dto.Added, 50000) * 0.0006; // max 30 points

            // Rating quality (0-5 scale, normalize to 0-20)
            if (dto.Rating.HasValue && dto.Rating.Value > 0)
                score += dto.Rating.Value * 4; // max 20 points

            // Metacritic bonus (0-100, normalize to 0-20)
            if (dto.Metacritic.HasValue && dto.Metacritic.Value > 0)
                score += dto.Metacritic.Value * 0.2; // max 20 points

            return Math.Round(score, 2);
        }

        private void Log(string message, LogLevel level = LogLevel.Information)
        {
            switch (level)
            {
                case LogLevel.Warning:
                    _logger.LogWarning("[RawgImport] {Message}", message);
                    break;
                case LogLevel.Error:
                    _logger.LogError("[RawgImport] {Message}", message);
                    break;
                default:
                    _logger.LogInformation("[RawgImport] {Message}", message);
                    break;
            }

            try
            {
                var logLine = $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}";
                File.AppendAllText(_logFilePath, logLine, _utf8NoBom);
            }
            catch
            {
                // Don't let logging failures break the import
            }
        }

        private enum PageStatus
        {
            Success,
            EndOfData,
            RateLimited,
            ServerError,
            Error
        }

        private class PageResult
        {
            public PageStatus Status { get; set; }
            public string? ErrorMessage { get; set; }
            public int Processed { get; set; }
            public int Added { get; set; }
            public int Skipped { get; set; }
            public int Filtered { get; set; }
            public int Duplicate { get; set; }
            public int Updated { get; set; }
        }
    }
}
