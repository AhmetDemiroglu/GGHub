using System.Globalization;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Logging
{
    /// <summary>
    /// Kuyruktaki hatalari DB'ye yazar ve gerekirse adminlere bildirir.
    ///
    /// NEDEN Program.cs'te kayitli (katalog job'larinin aksine): hata kaydi prod'da calismak
    /// ZORUNDA, Worker ise yalnizca gelistirici makinesinde acilir. Maliyet: hata olmadikca
    /// sifir (kuyrukta bekler), hata basina 2-3 kucuk sorgu.
    ///
    /// BILEREK ILogger KULLANMAZ: buradaki bir LogError, Serilog sink'i uzerinden ayni kuyruga
    /// geri donerdi (DB erisilemezken sonsuz dongu). Yazim hatasi yalnizca konsola basilir.
    /// </summary>
    public class ErrorLogWriter : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ErrorLogQueue _queue;
        private readonly ErrorLogOptions _options;

        // Toplam bildirim freni (son bir saatteki bildirim zamanlari). Tek okuyucu, kilit gerekmez.
        private readonly Queue<DateTime> _recentNotifications = new();

        public ErrorLogWriter(IServiceProvider serviceProvider, ErrorLogQueue queue, IOptions<ErrorLogOptions> options)
        {
            _serviceProvider = serviceProvider;
            _queue = queue;
            _options = options.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_queue.Enabled) return;

            try
            {
                await foreach (var capture in _queue.Reader.ReadAllAsync(stoppingToken))
                {
                    try
                    {
                        await WriteAsync(capture, stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        return;
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[ErrorLog] Hata kaydi yazilamadi: {ex.GetType().Name}: {ex.Message}");
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Kapanis.
            }
        }

        private async Task WriteAsync(ErrorCapture capture, CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            var fingerprint = ErrorCaptureFactory.Fingerprint(
                capture.Source, capture.ExceptionType, capture.TopFrame, capture.Logger, capture.Method, capture.RouteTemplate);

            var group = await db.ErrorGroups.FirstOrDefaultAsync(g => g.Fingerprint == fingerprint, ct);
            var isNew = group is null;
            var reopened = false;

            if (group is null)
            {
                group = new ErrorGroup
                {
                    Fingerprint = fingerprint,
                    Source = capture.Source,
                    ExceptionType = ErrorCaptureFactory.Truncate(capture.ExceptionType, 256),
                    Logger = capture.Logger is null ? null : ErrorCaptureFactory.Truncate(capture.Logger, 256),
                    Method = capture.Method,
                    RouteTemplate = capture.RouteTemplate is null ? null : ErrorCaptureFactory.Truncate(capture.RouteTemplate, 256),
                    FirstSeenAt = capture.OccurredAt,
                    Status = ErrorGroupStatus.Open
                };
                db.ErrorGroups.Add(group);
            }
            else if (group.Status == ErrorGroupStatus.Resolved)
            {
                // "Cozuldu" denen hata geri geldi: yeniden ac ve bildir.
                group.Status = ErrorGroupStatus.Open;
                group.ResolvedAt = null;
                reopened = true;
            }

            group.Count += 1;
            group.LastSeenAt = capture.OccurredAt;
            group.Message = ErrorCaptureFactory.Truncate(capture.Message, ErrorCaptureFactory.MaxMessage);
            group.StatusCode = capture.StatusCode ?? group.StatusCode;

            // Olay freni: firtinada sayac artar ama ayni stack yuzlerce kez saklanmaz.
            var storeEvent = true;
            if (!isNew)
            {
                var hourAgo = capture.OccurredAt.AddHours(-1);
                var recent = await db.ErrorEvents.CountAsync(e => e.ErrorGroupId == group.Id && e.OccurredAt >= hourAgo, ct);
                storeEvent = recent < _options.MaxEventsPerGroupPerHour;
            }

            if (storeEvent)
            {
                group.Events.Add(new ErrorEvent
                {
                    OccurredAt = capture.OccurredAt,
                    Message = ErrorCaptureFactory.Truncate(capture.Message, ErrorCaptureFactory.MaxMessage),
                    StackTrace = capture.StackTrace,
                    InnerChain = capture.InnerChain,
                    Method = capture.Method,
                    Path = capture.Path is null ? null : ErrorCaptureFactory.Truncate(capture.Path, 512),
                    QueryString = capture.QueryString,
                    StatusCode = capture.StatusCode,
                    UserId = capture.UserId,
                    Username = capture.Username is null ? null : ErrorCaptureFactory.Truncate(capture.Username, 64),
                    UserAgent = capture.UserAgent is null ? null : ErrorCaptureFactory.Truncate(capture.UserAgent, 512),
                    Locale = capture.Locale is null ? null : ErrorCaptureFactory.Truncate(capture.Locale, 16),
                    TraceId = capture.TraceId is null ? null : ErrorCaptureFactory.Truncate(capture.TraceId, 64),
                    Environment = capture.Environment
                });
            }

            var shouldNotify = group.Status == ErrorGroupStatus.Open && (isNew || reopened) && UnderNotificationCaps(group, capture.OccurredAt);
            if (shouldNotify) group.LastNotifiedAt = capture.OccurredAt;

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException) when (isNew)
            {
                // Iki container ayni anda ayni grubu acti (unique parmak izi). Digeri kazandi;
                // bu olay kuyruga geri konur ve ikinci turda mevcut grubun sayacina islenir.
                _queue.Enqueue(capture);
                return;
            }

            if (shouldNotify)
            {
                _recentNotifications.Enqueue(capture.OccurredAt);
                await NotifyAdminsAsync(scope, db, group, reopened, ct);
            }
        }

        private bool UnderNotificationCaps(ErrorGroup group, DateTime now)
        {
            if (group.LastNotifiedAt.HasValue && group.LastNotifiedAt.Value > now.AddHours(-_options.NotifyCooldownHours))
                return false;

            while (_recentNotifications.Count > 0 && _recentNotifications.Peek() < now.AddHours(-1))
            {
                _recentNotifications.Dequeue();
            }
            return _recentNotifications.Count < _options.MaxNotificationsPerHour;
        }

        private static async Task NotifyAdminsAsync(IServiceScope scope, GGHubDbContext db, ErrorGroup group, bool reopened, CancellationToken ct)
        {
            var admins = await db.Users.AsNoTracking()
                .Where(u => u.Role == "Admin" && !u.IsDeleted && !u.IsBanned && !u.IsAiAgent)
                .Select(u => new { u.Id, u.PreferredLocale })
                .ToListAsync(ct);
            if (admins.Count == 0) return;

            var endpoint = group.Source == ErrorSource.Api && group.RouteTemplate is not null
                ? $"{group.Method} /{group.RouteTemplate.TrimStart('/')}"
                : ShortName(group.Logger) ?? group.Source.ToString();
            var args = new Dictionary<string, string>
            {
                ["endpoint"] = endpoint,
                ["error"] = ShortName(group.ExceptionType) ?? group.ExceptionType
            };
            var key = reopened ? "admin.reopenedErrorNotification" : "admin.newErrorNotification";

            var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
            foreach (var admin in admins)
            {
                // Arka plan servisinde istek kulturu yok (bkz. BirthdayGreetingJob): uyumluluk
                // alani Notification.Message alicinin dilinde yazilsin.
                var previous = CultureInfo.CurrentUICulture;
                try
                {
                    CultureInfo.CurrentUICulture = new CultureInfo(AppText.NormalizeLocale(admin.PreferredLocale));
                    await notifications.CreateNotificationAsync(
                        recipientUserId: admin.Id,
                        type: NotificationType.SystemAlert,
                        messageKey: key,
                        messageArgs: args,
                        link: null,
                        actorUserId: null);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[ErrorLog] Admin bildirimi gonderilemedi: {ex.GetType().Name}: {ex.Message}");
                }
                finally
                {
                    CultureInfo.CurrentUICulture = previous;
                }
            }
        }

        /// <summary>"Npgsql.PostgresException" -> "PostgresException".</summary>
        private static string? ShortName(string? fullName)
        {
            if (string.IsNullOrEmpty(fullName)) return null;
            // Exception'siz log kaydi: tip yerine log sablonu gelir, noktadan bolunmez.
            if (fullName.StartsWith("LogError:", StringComparison.Ordinal)) return fullName.Length > 80 ? fullName[..80] : fullName;
            var index = fullName.LastIndexOf('.');
            return index >= 0 && index < fullName.Length - 1 ? fullName[(index + 1)..] : fullName;
        }
    }
}
