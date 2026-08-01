using GGHub.Core.Entities;
using GGHub.Core.Utilities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace GGHub.Infrastructure.Services
{
    public enum BirthdayChannel
    {
        Email,
        Notification
    }

    /// <summary>
    /// Dogum gunu aday sorgusunun TEK kaynagi. Hem gonderim job'i hem de admin teshis ucu
    /// buradan gecer; teshis ucunun job'dan farkli bir sorgu calistirmasi, tam da hata
    /// aradigimiz anda yanlis cevap verirdi.
    ///
    /// EF'in .Month / .Day cevirisi BILEREK kullanilmiyor: EXTRACT bir timestamptz uzerinde
    /// oturumun TimeZone GUC'una gore degerlendirilir. Railway'de bu ayar degisirse her
    /// dogum gunu sessizce kayar ve hicbir test patlamaz. "AT TIME ZONE 'UTC'" ile saat
    /// dilimi SQL icinde sabitlenir.
    ///
    /// UTC dogru okuma: web profil formu tarihi offset duzeltmesiyle tam 00:00 UTC'ye
    /// oturtarak gonderiyor ve DateOfBirth'un baska yazan yolu yok
    /// (tek yazma noktasi ProfileService.UpdateProfileAsync).
    /// </summary>
    public static class BirthdayGreetingQuery
    {
        private const string Base = """
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

        private const string DateMatch = """

              AND (
                    (EXTRACT(MONTH FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = @month
                     AND EXTRACT(DAY FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = @day)
                 OR (@leapFallback
                     AND EXTRACT(MONTH FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = 2
                     AND EXTRACT(DAY FROM (u."DateOfBirth" AT TIME ZONE 'UTC')) = 29)
                  )
            """;

        // Sosyal giriste saglayici e-postayi vermezse sentetik adres uretiliyor
        // (AuthService: {provider}_{key}@users.gghub.social). Kutu YOK; hard bounce
        // Resend alan adi itibarini yakar. Bu kullanicilar bildirimi ve push'u ALIR.
        // NOT: SQL metninin ICINE yorum satiri konulmuyor, yorumlar C# tarafinda kaliyor.
        private const string SyntheticEmailFilter = """

              AND u."Email" NOT LIKE '%@users.gghub.social'
            """;

        // Kolon adlari kanal basina AYRI sabitte; hicbir kolon adi degiskenden gelmiyor.
        private const string EmailTail = """

              AND (g."Id" IS NULL OR g."EmailSentAt" IS NULL)
            ORDER BY u."Id"
            LIMIT @limit
            """;

        private const string NotificationTail = """

              AND (g."Id" IS NULL OR g."NotificationSentAt" IS NULL)
            ORDER BY u."Id"
            LIMIT @limit
            """;

        public static string Sql(BirthdayChannel channel) => channel == BirthdayChannel.Email
            ? Base + SyntheticEmailFilter + DateMatch + EmailTail
            : Base + DateMatch + NotificationTail;

        public static async Task<List<User>> LoadCandidatesAsync(
            GGHubDbContext context, BirthdayChannel channel, DateOnly today, int limit, CancellationToken ct)
        {
            return await context.Users
                .FromSqlRaw(
                    Sql(channel),
                    new NpgsqlParameter("year", today.Year),
                    new NpgsqlParameter("month", today.Month),
                    new NpgsqlParameter("day", today.Day),
                    new NpgsqlParameter("leapFallback", BirthdayCalendar.IsLeapDayFallback(today)),
                    new NpgsqlParameter("limit", limit))
                .AsNoTracking()
                .ToListAsync(ct);
        }
    }
}
