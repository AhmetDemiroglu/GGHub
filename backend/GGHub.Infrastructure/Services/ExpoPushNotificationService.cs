using System.Net.Http.Json;
using System.Text.Json;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
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

        public async Task RegisterTokenAsync(int userId, string token, string platform)
        {
            if (string.IsNullOrWhiteSpace(token)) return;

            var existing = await _context.PushTokens.FirstOrDefaultAsync(t => t.Token == token);
            if (existing != null)
            {
                existing.UserId = userId;
                existing.Platform = platform;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _context.PushTokens.AddAsync(new PushToken
                {
                    UserId = userId,
                    Token = token,
                    Platform = platform
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

        public async Task SendToUserAsync(int userId, string title, string body, string? link = null)
        {
            try
            {
                var tokens = await _context.PushTokens
                    .Where(t => t.UserId == userId)
                    .Select(t => t.Token)
                    .ToListAsync();

                if (tokens.Count == 0) return;

                var messages = tokens.Select(t => new
                {
                    to = t,
                    title,
                    body,
                    sound = "default",
                    data = new { link }
                });

                var response = await _httpClient.PostAsJsonAsync(ExpoPushUrl, messages);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Expo push send failed with status {Status}", response.StatusCode);
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                await RemoveUnregisteredTokensAsync(json, tokens);
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
