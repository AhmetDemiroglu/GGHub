using GGHub.Core.Utilities;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// AI bot motoru. WebAPI icinde (Railway) calisir; SignalR ile canli mesaj ve bildirim ancak
    /// oradan gidebilir. Program.cs'teki "job'lar Worker'da" kuralinin mesru istisnasi: kullaniciyla
    /// konusan bir is prod'da calismak zorunda (BirthdayGreetingJob ile ayni gerekce).
    ///
    /// Her tikte:
    ///   1) Takilmis gorevleri kurtarir (Running kalip 10 dk'yi gecenler).
    ///   2) Planlayiciyi calistirir (PlanIntervalMinutes'ta bir).
    ///   3) Zamani gelmis gorevleri FOR UPDATE SKIP LOCKED ile sahiplenip isler.
    ///
    /// Iki kapi: host (AiAgents:HostEnabled, config) + admin (AiSettings.AgentsEnabled, DB).
    /// Host kapisi kapaliysa servis hic dongu kurmaz.
    /// </summary>
    public class AiAgentEngine : BackgroundService
    {
        private const int MaxAttempts = 3;
        private static readonly TimeSpan StuckAfter = TimeSpan.FromMinutes(10);

        private readonly IServiceProvider _services;
        private readonly AiAgentHostSettings _host;
        private readonly ILogger<AiAgentEngine> _logger;
        private DateTime _lastPlanUtc = DateTime.MinValue;

        public AiAgentEngine(IServiceProvider services, IOptions<AiAgentHostSettings> host, ILogger<AiAgentEngine> logger)
        {
            _services = services;
            _host = host.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_host.HostEnabled)
            {
                _logger.LogInformation("[AiAgents] Host kapisi kapali (AiAgents:HostEnabled=false); motor calismiyor.");
                return;
            }

            _logger.LogInformation("[AiAgents] Motor basladi. Tik: {Tick} sn, tik basina en fazla {Max} gorev.",
                _host.TickSeconds, _host.MaxTasksPerTick);

            // Deploy sonrasi migration'in bitmesini ve uygulamanin isinmasini bekle.
            await SafeDelay(TimeSpan.FromSeconds(20), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await TickAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[AiAgents] Tik hatasi.");
                }

                await SafeDelay(TimeSpan.FromSeconds(Math.Max(5, _host.TickSeconds)), stoppingToken);
            }
        }

        private async Task TickAsync(CancellationToken ct)
        {
            using (var scope = _services.CreateScope())
            {
                var settings = await scope.ServiceProvider.GetRequiredService<IAiSettingsProvider>().GetAsync(ct);
                if (!settings.AgentsEnabled) return;

                var db = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                await RecoverStuckAsync(db, ct);

                if (DateTime.UtcNow - _lastPlanUtc >= TimeSpan.FromMinutes(Math.Max(1, _host.PlanIntervalMinutes)))
                {
                    _lastPlanUtc = DateTime.UtcNow;
                    await scope.ServiceProvider.GetRequiredService<AiAgentPlanner>().PlanAsync(_host.PlanIntervalMinutes, ct);
                }
            }

            var claimed = await ClaimAsync(_host.MaxTasksPerTick, ct);
            foreach (var taskId in claimed)
            {
                if (ct.IsCancellationRequested) break;
                await ProcessOneAsync(taskId, ct);
            }
        }

        /// <summary>
        /// Zamani gelmis gorevleri atomik olarak Running yapar. SKIP LOCKED: ayni anda calisan ikinci
        /// bir container (rolling deploy) kilitli satirlari atlar, ayni gorev iki kez islenmez.
        /// </summary>
        private async Task<List<long>> ClaimAsync(int max, CancellationToken ct)
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
            var now = DateTime.UtcNow;

            return await db.Database.SqlQuery<long>($"""
                UPDATE "AiAgentTasks"
                SET "Status" = {(int)AiAgentTaskStatus.Running}, "StartedAt" = {now}, "Attempts" = "Attempts" + 1
                WHERE "Id" IN (
                    SELECT "Id" FROM "AiAgentTasks"
                    WHERE "Status" = {(int)AiAgentTaskStatus.Pending} AND "ScheduledAt" <= {now}
                    ORDER BY "ScheduledAt"
                    LIMIT {max}
                    FOR UPDATE SKIP LOCKED)
                RETURNING "Id" AS "Value"
                """).ToListAsync(ct);
        }

        private async Task ProcessOneAsync(long taskId, CancellationToken ct)
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
            var processor = scope.ServiceProvider.GetRequiredService<AiAgentTaskProcessor>();

            var task = await db.AiAgentTasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == taskId, ct);
            if (task is null) return;

            try
            {
                var outcome = await processor.ProcessAsync(task, ct);
                task.Status = outcome.Status;
                task.ResultSummary = Truncate(outcome.Summary, 300);
                task.ResultEntityId = outcome.ResultEntityId;
                if (outcome.Text is not null)
                {
                    task.Model = outcome.Text.Model;
                    task.InputTokens = outcome.Text.InputTokens;
                    task.OutputTokens = outcome.Text.OutputTokens;
                }
            }
            catch (GeminiBudgetExceededException ex)
            {
                // Bot tavani doldu (yedek model). Ay sonuna kadar Gemma yetmezse gorevler atlanir.
                task.Status = AiAgentTaskStatus.Failed;
                task.Error = Truncate("Bot butcesi doldu: " + ex.Message, 500);
            }
            catch (GeminiQuotaExceededException ex) when (task.Attempts < MaxAttempts)
            {
                // Iki model de reddetti: biraz sonra tekrar dene.
                task.Status = AiAgentTaskStatus.Pending;
                task.ScheduledAt = DateTime.UtcNow.AddMinutes(15);
                task.Error = Truncate(ex.Message, 500);
            }
            catch (Exception ex) when (ex is InvalidOperationException or UnauthorizedAccessException or KeyNotFoundException)
            {
                // Is kurali reddi (yanit izni yok, engel, gonderi silinmis, zaten incelemis...).
                task.Status = AiAgentTaskStatus.Skipped;
                task.Error = Truncate(ex.Message, 500);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "[AiAgents] Gorev {Id} ({Type}) basarisiz.", task.Id, task.Type);
                task.Status = task.Attempts < MaxAttempts ? AiAgentTaskStatus.Pending : AiAgentTaskStatus.Failed;
                task.ScheduledAt = DateTime.UtcNow.AddMinutes(5);
                task.Error = Truncate(ex.Message, 500);
            }

            if (task.Status != AiAgentTaskStatus.Pending)
            {
                task.CompletedAt = DateTime.UtcNow;
            }

            task.ResultSummary = Truncate(task.ResultSummary, 300);
            task.Error = Truncate(task.Error, 500);

            try
            {
                await WriteResultAsync(task);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                // Sonuc satiri yazilamazsa gorev Running KALMAMALI: 10 dk sonra kurtarilip yeniden
                // islenir ve is zaten yapildiysa (gonderi yayinlandi) ikinci kez yapilir. Metin
                // alanlari olmadan durumu yazmayi bir kez daha dene. Hata tikin geri kalanini da
                // durdurmaz (eskiden ayni tikteki diger gorevler islenmeden kaliyordu).
                _logger.LogError(ex, "[AiAgents] Gorev {Id} sonucu yazilamadi; ozet olmadan yeniden deneniyor.", task.Id);
                task.ResultSummary = null;
                task.Error = "Sonuc ozeti yazilamadi: " + ex.GetType().Name;
                await WriteResultAsync(task);
            }
        }

        private async Task WriteResultAsync(AiAgentTask task)
        {
            // Sonucu TEMIZ bir scope'ta yaz: islem yarida kaldiysa (orn. gonderi kaydi patladi)
            // ayni DbContext'te izlenen yarim varliklar kalmis olabilir ve SaveChanges onlari tekrar
            // yazmaya calisirdi. ExecuteUpdate yalnizca gorev satirina dokunur.
            using var resultScope = _services.CreateScope();
            var resultDb = resultScope.ServiceProvider.GetRequiredService<GGHubDbContext>();
            await resultDb.AiAgentTasks.Where(t => t.Id == task.Id).ExecuteUpdateAsync(s => s
                .SetProperty(t => t.Status, task.Status)
                .SetProperty(t => t.ScheduledAt, task.ScheduledAt)
                .SetProperty(t => t.CompletedAt, task.CompletedAt)
                .SetProperty(t => t.TargetUserId, task.TargetUserId)
                .SetProperty(t => t.TargetPostId, task.TargetPostId)
                .SetProperty(t => t.TargetGameId, task.TargetGameId)
                .SetProperty(t => t.TargetReviewId, task.TargetReviewId)
                .SetProperty(t => t.TargetListId, task.TargetListId)
                .SetProperty(t => t.ConversationId, task.ConversationId)
                .SetProperty(t => t.ResultEntityId, task.ResultEntityId)
                .SetProperty(t => t.ResultSummary, task.ResultSummary)
                .SetProperty(t => t.Model, task.Model)
                .SetProperty(t => t.InputTokens, task.InputTokens)
                .SetProperty(t => t.OutputTokens, task.OutputTokens)
                .SetProperty(t => t.Error, task.Error), CancellationToken.None);
        }

        private static async Task RecoverStuckAsync(GGHubDbContext db, CancellationToken ct)
        {
            var stuckBefore = DateTime.UtcNow - StuckAfter;
            await db.AiAgentTasks
                .Where(t => t.Status == AiAgentTaskStatus.Running && t.StartedAt < stuckBefore)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Status, t => t.Attempts < MaxAttempts ? AiAgentTaskStatus.Pending : AiAgentTaskStatus.Failed)
                    .SetProperty(t => t.Error, "Yarida kaldi (yeniden baslatma ya da zaman asimi)."), ct);
        }

        /// <summary>Surrogate-guvenli kisaltma + yarim karakter temizligi (DB'ye yazilmadan once son savunma).</summary>
        private static string? Truncate(string? s, int max) => SafeText.RemoveLoneSurrogates(SafeText.TruncateOrNull(s, max));

        private static async Task SafeDelay(TimeSpan delay, CancellationToken ct)
        {
            try { await Task.Delay(delay, ct); }
            catch (OperationCanceledException) { }
        }
    }
}
