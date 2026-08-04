using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class NotificationPreferenceService : INotificationPreferenceService
    {
        private readonly GGHubDbContext _context;

        public NotificationPreferenceService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task<NotificationSettingsDto> GetSettingsAsync(int userId)
        {
            var pushEnabled = await _context.Users.AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.PushNotificationsEnabled)
                .FirstOrDefaultAsync();

            var stored = await _context.UserNotificationPreferences.AsNoTracking()
                .Where(p => p.UserId == userId)
                .ToDictionaryAsync(p => p.Type, p => p.Enabled);

            return new NotificationSettingsDto
            {
                PushEnabled = pushEnabled,
                // Liste HER ZAMAN tum yapilandirilabilir tipleri tasir: satiri olmayan
                // tip acik demektir ve istemcinin varsayilani bilmesi gerekmez.
                Preferences = NotificationPreferences.Configurable
                    .Select(type => new NotificationPreferenceDto
                    {
                        Type = type,
                        Enabled = !stored.TryGetValue(type, out var enabled) || enabled
                    })
                    .ToList()
            };
        }

        public async Task<NotificationSettingsDto> UpdateSettingsAsync(int userId, NotificationSettingsForUpdateDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return await GetSettingsAsync(userId);

            if (dto.PushEnabled.HasValue)
            {
                user.PushNotificationsEnabled = dto.PushEnabled.Value;
            }

            if (dto.Preferences is { Count: > 0 })
            {
                // Yalnizca YAPILANDIRILABILIR tipler yazilir; istemci dogum gununu ya da
                // enum'da olmayan bir sayiyi gonderirse sessizce yutulur.
                var incoming = dto.Preferences
                    .Where(p => Enum.IsDefined(p.Type) && NotificationPreferences.IsConfigurable(p.Type))
                    .GroupBy(p => p.Type)
                    .ToDictionary(g => g.Key, g => g.Last().Enabled);

                if (incoming.Count > 0)
                {
                    var types = incoming.Keys.ToList();
                    var existing = await _context.UserNotificationPreferences
                        .Where(p => p.UserId == userId && types.Contains(p.Type))
                        .ToListAsync();

                    foreach (var pair in incoming)
                    {
                        var row = existing.FirstOrDefault(p => p.Type == pair.Key);
                        if (row == null)
                        {
                            await _context.UserNotificationPreferences.AddAsync(new UserNotificationPreference
                            {
                                UserId = userId,
                                Type = pair.Key,
                                Enabled = pair.Value
                            });
                            continue;
                        }

                        if (row.Enabled == pair.Value) continue;
                        row.Enabled = pair.Value;
                        row.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return await GetSettingsAsync(userId);
        }

        public async Task<bool> IsEnabledAsync(int userId, NotificationType type)
        {
            if (!NotificationPreferences.IsConfigurable(type)) return true;

            // Satir yoksa varsayilan ACIK. Bu yuzden yalnizca "kapali" bir satir varsa false.
            var stored = await _context.UserNotificationPreferences.AsNoTracking()
                .Where(p => p.UserId == userId && p.Type == type)
                .Select(p => (bool?)p.Enabled)
                .FirstOrDefaultAsync();

            return stored ?? true;
        }
    }
}
