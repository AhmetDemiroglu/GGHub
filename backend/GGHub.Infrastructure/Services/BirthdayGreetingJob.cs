using System.Globalization;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Utilities;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Utilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Dogum gunu olan kullaniciya, YALNIZCA KENDISINE, mail (gece yarisi) ve uygulama ici
    /// bildirim + push (sabah) gonderir. Baska hicbir kullaniciya bildirim gitmez.
    ///
    /// NEDEN Program.cs'te kayitli (katalog job'larinin aksine): oradaki kural "yeni
    /// AddHostedService ekleme, GGHub.Worker'a ekle" der ve gerekcesi crawler'larin prod
    /// container'inda CPU yakmasini engellemektir. Worker ise YALNIZCA gelistirici
    /// makinesinde acilir; orada dursa hicbir kullanici kutlama almazdi. BackgroundEmailService
    /// ve DownloadEventRetentionJob ile ayni siniftan mesru bir istisna: kullaniciya mail
    /// gonderiyor, prod'da calismak ZORUNDA, maliyeti gunde birkac seq scan.
    ///
    /// TEK job iki gecis yapar (iki ayri BackgroundService iki ayri kayit demek olurdu).
    /// EmailHourLocal == NotificationHourLocal yapilirsa tek gecise duser.
    /// </summary>
    public class BirthdayGreetingJob : BackgroundService
    {
        private enum Channel { Email, Notification }

        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BirthdayGreetingJob> _logger;

        private readonly bool _enabled;
        private readonly bool _dryRun;
        private readonly int _emailHourLocal;
        private readonly int _notificationHourLocal;
        private readonly int _maxPerRun;
        private readonly TimeSpan _tick;

        /// <summary>Resend ucretsiz katmani ~2 istek/sn; gonderimler arasi nefes payi.</summary>
        private static readonly TimeSpan SendThrottle = TimeSpan.FromMilliseconds(600);

        public BirthdayGreetingJob(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<BirthdayGreetingJob> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;

            // Bayrak kontrolu job'in ICINDE okunuyor ama alanlar burada dolduruluyor;
            // ExecuteAsync'teki erken cikis FutureMetacriticCleanupJob kuralini uygular.
            _enabled = configuration.GetValue<bool>("Jobs:BirthdayGreeting:Enabled");
            _dryRun = configuration.GetValue<bool>("Jobs:BirthdayGreeting:DryRun");
            _emailHourLocal = Clamp(configuration.GetValue<int?>("Jobs:BirthdayGreeting:EmailHourLocal") ?? 0);
            _notificationHourLocal = Clamp(configuration.GetValue<int?>("Jobs:BirthdayGreeting:NotificationHourLocal") ?? 10);
            _maxPerRun = Math.Max(1, configuration.GetValue<int?>("Jobs:BirthdayGreeting:MaxPerRun") ?? 500);
            _tick = TimeSpan.FromMinutes(Math.Max(1, configuration.GetValue<double?>("Jobs:BirthdayGreeting:TickMinutes") ?? 30.0));
        }

        private static int Clamp(int hour) => Math.Min(23, Math.Max(0, hour));

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled)
            {
                _logger.LogInformation("[BirthdayGreeting] Job kapali (Jobs:BirthdayGreeting:Enabled).");
                return;
            }

            // 5 degil 2 dakika: 00:03'te yapilan bir redeploy gece yarisi turunu HALA yakalasin.
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            _logger.LogInformation(
                "[BirthdayGreeting] Basladi. Mail saati: {EmailHour}:00, bildirim saati: {NotificationHour}:00 (Istanbul). Tik: {Tick}. DryRun: {DryRun}.",
                _emailHourLocal, _notificationHourLocal, _tick, _dryRun);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var nowLocal = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BirthdayCalendar.Istanbul);
                    var today = DateOnly.FromDateTime(nowLocal.Date);

                    // ">=" BILEREK, "==" DEGIL: mukerrer gonderimi zaten DB damgasi engelliyor.
                    // ">=" ise kacirilan turu (deploy, restart, gun icinde girilen dogum tarihi)
                    // kendiliginden telafi eder. "==" olsaydi o saate denk gelen bir deploy
                    // turu SESSIZCE atlardi ve kullanici o yil hic kutlanmazdi.
                    if (nowLocal.Hour >= _emailHourLocal)
                        await RunPassAsync(Channel.Email, today, stoppingToken);

                    if (nowLocal.Hour >= _notificationHourLocal)
                        await RunPassAsync(Channel.Notification, today, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
                catch (Exception ex)
                {
                    // Tur basarisiz olsa da dongu devam etmeli; bir sonraki tik tekrar dener.
                    _logger.LogError(ex, "[BirthdayGreeting] Tur basarisiz");
                }

                try
                {
                    await Task.Delay(_tick, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
            }
        }

        private async Task RunPassAsync(Channel channel, DateOnly today, CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            var candidates = await LoadCandidatesAsync(context, channel, today, ct);
            if (candidates.Count == 0) return;

            _logger.LogInformation(
                "[BirthdayGreeting] {Channel} gecisi: {Count} aday ({Date}).",
                channel, candidates.Count, today);

            if (_dryRun)
            {
                foreach (var candidate in candidates)
                {
                    _logger.LogInformation(
                        "[BirthdayGreeting] DRY RUN {Channel}: userId={UserId} username={Username}",
                        channel, candidate.Id, candidate.Username);
                }
                return;
            }

            var locales = await ResolveLocalesAsync(context, candidates, ct);

            foreach (var candidate in candidates)
            {
                if (ct.IsCancellationRequested) return;

                var celebratedOn = BirthdayCalendar.OccurrenceInYear(candidate.DateOfBirth!.Value, today.Year);

                // Once ATOMIK TALEP, sonra gonderim. Cakisan bir container ayni satiri
                // alamaz (unique index + ON CONFLICT), boylece mukerrer dogum gunu maili
                // yapisal olarak imkansiz. Mukerrer mail, kacirilmis mailden daha kotudur.
                if (!await TryClaimAsync(context, channel, candidate.Id, today.Year, celebratedOn, ct))
                    continue;

                var locale = locales.TryGetValue(candidate.Id, out var l) ? l : "tr";

                try
                {
                    if (channel == Channel.Email)
                        await SendEmailAsync(scope, candidate, locale, ct);
                    else
                        await SendNotificationAsync(scope, candidate, locale);
                }
                catch (OperationCanceledException)
                {
                    await ReleaseClaimAsync(context, channel, candidate.Id, today.Year, CancellationToken.None);
                    return;
                }
                catch (Exception ex)
                {
                    // Damgayi GERI AL: ayni gun icindeki bir sonraki tik tekrar denesin.
                    _logger.LogError(ex, "[BirthdayGreeting] {Channel} gonderilemedi (userId={UserId})", channel, candidate.Id);
                    await ReleaseClaimAsync(context, channel, candidate.Id, today.Year, ct);
                    continue;
                }

                if (channel == Channel.Email)
                {
                    try { await Task.Delay(SendThrottle, ct); }
                    catch (OperationCanceledException) { return; }
                }
            }
        }

        // ---------------------------------------------------------------------
        // Aday sorgusu
        // ---------------------------------------------------------------------

        /// <summary>
        /// EF'in .Month / .Day cevirisi BILEREK kullanilmiyor: EXTRACT bir timestamptz
        /// uzerinde oturumun TimeZone GUC'una gore degerlendirilir. Railway'de bu ayar
        /// degisirse her dogum gunu sessizce kayar ve hicbir test patlamaz. "AT TIME ZONE
        /// 'UTC'" ile saat dilimi SQL icinde sabitlenir.
        ///
        /// UTC dogru okuma: web profil formu tarihi offset duzeltmesiyle tam 00:00 UTC'ye
        /// oturtarak gonderiyor ve DateOfBirth'un baska yazan yolu yok
        /// (tek yazma noktasi ProfileService.UpdateProfileAsync).
        /// </summary>
        private const string CandidateSqlBase = """
            SELECT u.*
            FROM "Users" u
            LEFT JOIN "BirthdayGreetings" g ON g."UserId" = u."Id" AND g."GreetingYear" = @year
            WHERE u."DateOfBirth" IS NOT NULL
              AND u."IsDeleted" = FALSE
              AND u."IsBanned" = FALSE
              AND u."IsEmailVerified" = TRUE
              AND u."IsSeeded" = FALSE
              AND u."Email" IS NOT NULL
              AND u."Email" <> ''
            """;

        private const string CandidateSqlDateMatch = """
              AND (
                    (EXTRACT(MONTH FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = @month
                     AND EXTRACT(DAY FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = @day)
                 OR (@leapFallback
                     AND EXTRACT(MONTH FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = 2
                     AND EXTRACT(DAY FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = 29)
                  )
            """;

        // Kolon adlari kanal basina AYRI sabitte; hicbir kolon adi degiskenden gelmiyor
        // (dinamik SQL yok).
        private const string EmailPassSql = CandidateSqlBase + """

              -- Sosyal giriste saglayici e-postayi vermezse sentetik adres uretiliyor
              -- (AuthService: {provider}_{key}@users.gghub.social). Kutu YOK; hard bounce
              -- Resend alan adi itibarini yakar. Bu kullanicilar bildirimi ve push'u ALIR.
              AND u."Email" NOT LIKE '%@users.gghub.social'
            """ + CandidateSqlDateMatch + """

              AND (g."Id" IS NULL OR g."EmailSentAt" IS NULL)
            ORDER BY u."Id"
            LIMIT @limit
            """;

        private const string NotificationPassSql = CandidateSqlBase + CandidateSqlDateMatch + """

              AND (g."Id" IS NULL OR g."NotificationSentAt" IS NULL)
            ORDER BY u."Id"
            LIMIT @limit
            """;

        private async Task<List<User>> LoadCandidatesAsync(
            GGHubDbContext context, Channel channel, DateOnly today, CancellationToken ct)
        {
            var sql = channel == Channel.Email ? EmailPassSql : NotificationPassSql;

            return await context.Users
                .FromSqlRaw(
                    sql,
                    new NpgsqlParameter("year", today.Year),
                    new NpgsqlParameter("month", today.Month),
                    new NpgsqlParameter("day", today.Day),
                    new NpgsqlParameter("leapFallback", BirthdayCalendar.IsLeapDayFallback(today)),
                    new NpgsqlParameter("limit", _maxPerRun))
                .AsNoTracking()
                .ToListAsync(ct);
        }

        // ---------------------------------------------------------------------
        // Atomik talep / geri alma
        // ---------------------------------------------------------------------

        private const string ClaimEmailSql = """
            INSERT INTO "BirthdayGreetings" ("UserId","GreetingYear","CelebratedOn","EmailSentAt","CreatedAt")
            VALUES (@userId, @year, @celebratedOn, NOW(), NOW())
            ON CONFLICT ("UserId","GreetingYear")
            DO UPDATE SET "EmailSentAt" = NOW()
            WHERE "BirthdayGreetings"."EmailSentAt" IS NULL
            """;

        private const string ClaimNotificationSql = """
            INSERT INTO "BirthdayGreetings" ("UserId","GreetingYear","CelebratedOn","NotificationSentAt","CreatedAt")
            VALUES (@userId, @year, @celebratedOn, NOW(), NOW())
            ON CONFLICT ("UserId","GreetingYear")
            DO UPDATE SET "NotificationSentAt" = NOW()
            WHERE "BirthdayGreetings"."NotificationSentAt" IS NULL
            """;

        private const string ReleaseEmailSql = """
            UPDATE "BirthdayGreetings" SET "EmailSentAt" = NULL
            WHERE "UserId" = @userId AND "GreetingYear" = @year
            """;

        private const string ReleaseNotificationSql = """
            UPDATE "BirthdayGreetings" SET "NotificationSentAt" = NULL
            WHERE "UserId" = @userId AND "GreetingYear" = @year
            """;

        /// <summary>0 satir donerse baska bir container zaten almistir, atlanir.</summary>
        private static async Task<bool> TryClaimAsync(
            GGHubDbContext context, Channel channel, int userId, int year, DateOnly celebratedOn, CancellationToken ct)
        {
            var sql = channel == Channel.Email ? ClaimEmailSql : ClaimNotificationSql;

            var affected = await context.Database.ExecuteSqlRawAsync(
                sql,
                new[]
                {
                    new NpgsqlParameter("userId", userId),
                    new NpgsqlParameter("year", year),
                    new NpgsqlParameter("celebratedOn", celebratedOn)
                },
                ct);

            return affected > 0;
        }

        private async Task ReleaseClaimAsync(
            GGHubDbContext context, Channel channel, int userId, int year, CancellationToken ct)
        {
            try
            {
                var sql = channel == Channel.Email ? ReleaseEmailSql : ReleaseNotificationSql;
                await context.Database.ExecuteSqlRawAsync(
                    sql,
                    new[] { new NpgsqlParameter("userId", userId), new NpgsqlParameter("year", year) },
                    ct);
            }
            catch (Exception ex)
            {
                // Geri alinamazsa kullanici bu yil o kanaldan kutlanmaz. Kotu ama mukerrer
                // gonderimden iyi; en azindan log'da gorunsun.
                _logger.LogError(ex, "[BirthdayGreeting] {Channel} damgasi geri alinamadi (userId={UserId})", channel, userId);
            }
        }

        // ---------------------------------------------------------------------
        // Gonderim
        // ---------------------------------------------------------------------

        private async Task SendEmailAsync(IServiceScope scope, User user, string locale, CancellationToken ct)
        {
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            // Fallback BILEREK localhost degil: prod'da env eksik kalirsa kullanicilara
            // localhost linki gitmesin (AuthController ayni anahtari kullaniyor).
            var frontendBaseUrl = (_configuration["App:FrontendBaseUrl"] ?? "https://gghub.social").TrimEnd('/');
            var celebrationUrl = $"{frontendBaseUrl}/birthday";

            var subject = AppText.GetFor(locale, "birthday.emailSubject");
            var body = EmailTemplates.GetBirthdayTemplate(DisplayName(user), celebrationUrl, locale);

            // IEmailQueue DEGIL: kuyruk bellek ici ve fire-and-forget, yani satiri
            // "gonderildi" damgalayip mail hic cikmayabilirdi. Job zaten istek yolunun
            // disinda, Resend'i beklemek serbest.
            await emailService.SendEmailAsync(user.Email, subject, body);

            _logger.LogInformation("[BirthdayGreeting] Mail gonderildi (userId={UserId}, locale={Locale})", user.Id, locale);
        }

        private async Task SendNotificationAsync(IServiceScope scope, User user, string locale)
        {
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            // CreateNotificationAsync, uyumluluk alani Notification.Message'i ambient
            // kulturden yaziyor. Arka plan servisinde istek kulturu YOK, container
            // varsayilanina duserdi. Alicinin dilini gecici olarak kuruyoruz.
            var previous = CultureInfo.CurrentUICulture;
            try
            {
                CultureInfo.CurrentUICulture = new CultureInfo(locale);

                await notificationService.CreateNotificationAsync(
                    recipientUserId: user.Id,
                    type: NotificationType.Birthday,
                    messageKey: "birthday.notification",
                    messageArgs: null,
                    // Locale oneki YOK: web localizeHref ile ekliyor, mobil toMobileRoute
                    // uzerinden 1:1 kullaniyor.
                    link: "/birthday",
                    // Aktor YOK: bildirimi bir kullanici degil sistem uretiyor.
                    actorUserId: null);
            }
            finally
            {
                CultureInfo.CurrentUICulture = previous;
            }

            _logger.LogInformation("[BirthdayGreeting] Bildirim gonderildi (userId={UserId}, locale={Locale})", user.Id, locale);
        }

        // ---------------------------------------------------------------------
        // Yardimcilar
        // ---------------------------------------------------------------------

        /// <summary>
        /// Cozum sirasi: en yeni PushToken.Locale -> User.PreferredLocale -> "tr".
        /// Cihaz dili en guclu sinyal (kullanici uygulamayi o dilde kullaniyor);
        /// web-only kullanicilarda tek sinyal giris anindaki Accept-Language.
        /// </summary>
        private static async Task<Dictionary<int, string>> ResolveLocalesAsync(
            GGHubDbContext context, List<User> candidates, CancellationToken ct)
        {
            var ids = candidates.Select(u => u.Id).ToList();

            var deviceLocales = await context.PushTokens
                .AsNoTracking()
                .Where(t => ids.Contains(t.UserId) && t.Locale != null)
                .OrderByDescending(t => t.UpdatedAt)
                .Select(t => new { t.UserId, t.Locale })
                .ToListAsync(ct);

            var byUser = new Dictionary<int, string>();
            foreach (var row in deviceLocales)
            {
                if (!byUser.ContainsKey(row.UserId))
                    byUser[row.UserId] = AppText.NormalizeLocale(row.Locale);
            }

            foreach (var user in candidates)
            {
                if (byUser.ContainsKey(user.Id)) continue;
                byUser[user.Id] = string.IsNullOrWhiteSpace(user.PreferredLocale)
                    ? "tr"
                    : AppText.NormalizeLocale(user.PreferredLocale);
            }

            return byUser;
        }

        /// <summary>Gercek ad varsa o, yoksa kullanici adi. NotificationService ile ayni kural.</summary>
        private static string DisplayName(User user)
        {
            var full = $"{user.FirstName} {user.LastName}".Trim();
            return string.IsNullOrWhiteSpace(full) ? user.Username : full;
        }
    }
}
