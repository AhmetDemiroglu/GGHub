using System.Net.Http.Json;
using System.Text.Json;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    // Sends push notifications through the Expo Push API. Token delivery activates once a
    // valid EAS projectId (mobile) and an APNs key (Expo credentials) are configured; until
    // then registration simply stores tokens and sends are no-ops with no tokens on file.
    public class ExpoPushNotificationService : IPushNotificationService
    {
        private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

        private readonly HttpClient _httpClient;
        private readonly GGHubDbContext _context;
        private readonly ILogger<ExpoPushNotificationService> _logger;

        public ExpoPushNotificationService(HttpClient httpClient, GGHubDbContext context, ILogger<ExpoPushNotificationService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _logger = logger;
        }

        public async Task RegisterTokenAsync(int userId, string token, string platform, string? locale = null)
        {
            if (string.IsNullOrWhiteSpace(token)) return;

            // Locale gecilmediyse istegin kendi Accept-Language'inden yakala. Mobil istemci
            // her isteğe uygulama ici dili zaten ekliyor (bkz. mobile-ui/src/api/client.ts),
            // dolayisiyla bu, mobilde hicbir degisiklik gerektirmeden dogru dili verir.
            var resolvedLocale = AppText.NormalizeLocale(locale ?? AppText.CurrentLocale());

            var existing = await _context.PushTokens.FirstOrDefaultAsync(t => t.Token == token);
            if (existing != null)
            {
                existing.UserId = userId;
                existing.Platform = platform;
                existing.Locale = resolvedLocale;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _context.PushTokens.AddAsync(new PushToken
                {
                    UserId = userId,
                    Token = token,
                    Platform = platform,
                    Locale = resolvedLocale
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task RemoveTokenAsync(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return;

            var existing = await _context.PushTokens.FirstOrDefaultAsync(t => t.Token == token);
            if (existing != null)
            {
                _context.PushTokens.Remove(existing);
                await _context.SaveChangesAsync();
            }
        }

        public async Task SendToUserAsync(int userId, string title, string body, string? link = null, int? notificationId = null)
        {
            var tokens = await GetTokensAsync(userId);
            if (tokens.Count == 0) return;

            await SendAsync(userId, tokens.Select(t => (t.Token, title, body)).ToList(), link, notificationId);
        }

        public async Task SendLocalizedToUserAsync(
            int userId,
            string bodyKey,
            IDictionary<string, object?>? bodyArgs = null,
            string? link = null,
            int? notificationId = null,
            string? title = null)
        {
            var tokens = await GetTokensAsync(userId);
            if (tokens.Count == 0) return;

            // Govde her cihazin KENDI dilinde render edilir. Ayni kullanici farkli dillerde
            // iki cihaz kullaniyor olabilir; render dil basina bir kez yapilip paylasilir.
            var byLocale = new Dictionary<string, string>();
            var payloads = new List<(string Token, string Title, string Body)>(tokens.Count);

            foreach (var token in tokens)
            {
                var locale = AppText.NormalizeLocale(token.Locale);
                if (!byLocale.TryGetValue(locale, out var body))
                {
                    body = AppText.GetFor(locale, bodyKey, bodyArgs);
                    byLocale[locale] = body;
                }

                payloads.Add((token.Token, title ?? "GGHub", body));
            }

            await SendAsync(userId, payloads, link, notificationId);
        }

        private async Task<List<PushToken>> GetTokensAsync(int userId)
        {
            return await _context.PushTokens
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .ToListAsync();
        }

        private async Task SendAsync(
            int userId,
            List<(string Token, string Title, string Body)> payloads,
            string? link,
            int? notificationId)
        {
            try
            {
                if (payloads.Count == 0) return;

                var messages = payloads.Select(p => new
                {
                    to = p.Token,
                    title = p.Title,
                    body = p.Body,
                    sound = "default",
                    // Android: uygulamanin olusturdugu 'default' kanalini kullan (heads-up + ses)
                    // ve yuksek oncelikle hemen teslim et. iOS bu iki alani gormezden gelir.
                    channelId = "default",
                    priority = "high",
                    // notificationId: bildirime dokununca istemci tam o satiri okundu yapabilsin diye.
                    data = new { link, notificationId }
                });

                var response = await _httpClient.PostAsJsonAsync(ExpoPushUrl, messages);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Expo push send failed with status {Status}", response.StatusCode);
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                await RemoveUnregisteredTokensAsync(json, payloads.Select(p => p.Token).ToList());
            }
            catch (Exception ex)
            {
                // Push delivery must never break the originating action (follow, comment, message, ...).
                _logger.LogError(ex, "Failed to send push notification to user {UserId}", userId);
            }
        }

        // Expo returns one ticket per message, in the same order. A ticket with
        // status "error" and details.error == "DeviceNotRegistered" means the token is dead.
        private async Task RemoveUnregisteredTokensAsync(string json, List<string> tokens)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
                {
                    return;
                }

                var toRemove = new List<string>();
                var index = 0;
                foreach (var ticket in data.EnumerateArray())
                {
                    if (index < tokens.Count
                        && ticket.TryGetProperty("status", out var status)
                        && status.GetString() == "error"
                        && ticket.TryGetProperty("details", out var details)
                        && details.TryGetProperty("error", out var errorCode)
                        && errorCode.GetString() == "DeviceNotRegistered")
                    {
                        toRemove.Add(tokens[index]);
                    }
                    index++;
                }

                if (toRemove.Count > 0)
                {
                    var stale = await _context.PushTokens.Where(t => toRemove.Contains(t.Token)).ToListAsync();
                    _context.PushTokens.RemoveRange(stale);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse Expo push receipts");
            }
        }
    }
}
