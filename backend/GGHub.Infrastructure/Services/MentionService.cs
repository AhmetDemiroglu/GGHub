using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <inheritdoc />
    public class MentionService : IMentionService
    {
        /// <summary>
        /// Tek gonderide bildirim gonderilecek azami bahis sayisi. Sinir yalnizca bildirim
        /// yayilimini kirpar; gonderi ASLA reddedilmez, cunku istemci bu kurali bilmiyor ve
        /// "11. etiketi yazdim, gonderi gitmedi" gibi bir davranis kullaniciya aciklanamaz.
        /// </summary>
        private const int MaxMentionsPerBody = 10;

        // Neden \p{L} ve \p{N}, \w degil: kullanici adlarinda charset dogrulamasi HIC yok
        // (UserForRegisterDto yalnizca [Required], istemciler yalnizca min 3 karakter).
        // Dolayisiyla "ömer", "şule" gibi adlar gercek ve \w bunlari ASCII disi diye elerdi;
        // o kullanicilar hicbir zaman etiketlenemezdi.
        //
        // Neden negatif lookbehind (?<![\p{L}\p{N}_.]): "@" isaretinin SOLUNDA ad karakteri
        // varsa bu bir bahis degildir. Boylece "ahmet@site.com" gibi e-postalarda "@site"
        // yakalanmaz; bahis yalnizca satir basi, bosluk veya noktalama sonrasi baslar.
        private static readonly Regex MentionRegex = new(
            @"(?<![\p{L}\p{N}_.])@([\p{L}\p{N}_.]{3,30})",
            RegexOptions.Compiled);

        private readonly GGHubDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<MentionService> _logger;

        public MentionService(
            GGHubDbContext context,
            INotificationService notificationService,
            ILogger<MentionService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Metindeki bahis handle'larini ("@" harici) cikarir. Buyuk/kucuk harf duyarsiz
        /// tekillestirir: "@Ahmet" ve "@ahmet" TEK bahistir. Sonuc MaxMentionsPerBody ile kirpilir.
        /// </summary>
        public static IReadOnlyCollection<string> ExtractHandles(string? content)
        {
            if (string.IsNullOrWhiteSpace(content)) return Array.Empty<string>();

            // OrdinalIgnoreCase: tr-TR kulturunde "I" -> "ı" donusumu tekillestirmeyi
            // sessizce bozardi. Kultur bagimsiz karsilastirma sart.
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var handles = new List<string>();

            foreach (Match match in MentionRegex.Matches(content))
            {
                var handle = match.Groups[1].Value;
                if (!seen.Add(handle)) continue;

                handles.Add(handle);
                if (handles.Count >= MaxMentionsPerBody) break;
            }

            return handles;
        }

        public async Task NotifyMentionsAsync(
            int actorUserId,
            string? content,
            string messageKey,
            string link,
            IEnumerable<int>? excludeUserIds = null)
        {
            try
            {
                var handles = ExtractHandles(content);
                if (handles.Count == 0) return;

                await NotifyResolvedAsync(actorUserId, handles, messageKey, link, excludeUserIds);
            }
            catch (Exception ex)
            {
                // Bahis bildirimi push gibi best-effort: asil eylemi (inceleme/yorum) ASLA bozmaz.
                _logger.LogError(ex, "Failed to process mentions for actor {ActorUserId} on link {Link}", actorUserId, link);
            }
        }

        public async Task NotifyNewMentionsAsync(
            int actorUserId,
            string? oldContent,
            string? newContent,
            string messageKey,
            string link,
            IEnumerable<int>? excludeUserIds = null)
        {
            try
            {
                var newHandles = ExtractHandles(newContent);
                if (newHandles.Count == 0) return;

                // Eski metinde zaten bulunan handle'lar bildirilmez; yoksa her duzenleme
                // ayni kisilere bildirim yagdirirdi.
                var oldHandles = new HashSet<string>(ExtractHandles(oldContent), StringComparer.OrdinalIgnoreCase);
                var addedHandles = newHandles.Where(h => !oldHandles.Contains(h)).ToList();
                if (addedHandles.Count == 0) return;

                await NotifyResolvedAsync(actorUserId, addedHandles, messageKey, link, excludeUserIds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process new mentions for actor {ActorUserId} on link {Link}", actorUserId, link);
            }
        }

        private async Task NotifyResolvedAsync(
            int actorUserId,
            IReadOnlyCollection<string> handles,
            string messageKey,
            string link,
            IEnumerable<int>? excludeUserIds)
        {
            // Handle'lari normalize edilmis anahtara cevir: eski u.Username.ToLower() ile ayni
            // niyet, ama artik hem indeksli (IX_Users_UsernameNormalized) hem de katlama-farkinda.
            // Boylece "@Ahmet" ve "@ahmetdemiroğlu" dogru kisiye cozulur.
            // Bos anahtarlar elenir; aksi halde cozulemeyen bir handle rastgele hesaba eslesebilirdi.
            var normalizedHandles = handles
                .Select(UsernameNormalizer.Normalize)
                .Where(h => h.Length > 0)
                .Distinct()
                .ToList();

            if (normalizedHandles.Count == 0) return;

            var excluded = excludeUserIds?.ToHashSet() ?? new HashSet<int>();

            var recipients = await _context.Users
                .AsNoTracking()
                .Where(u => normalizedHandles.Contains(u.UsernameNormalized!) && !u.IsDeleted && !u.IsBanned)
                .WhereVisibleTo(_context, actorUserId)
                .WhereNotBlockedWith(_context, actorUserId)
                .Select(u => u.Id)
                .ToListAsync();

            foreach (var recipientId in recipients)
            {
                // Kendine bildirim yok (bahis istemcide yine link olarak render edilir).
                if (recipientId == actorUserId) continue;
                // Ayni olay icin zaten bildirilmis kullaniciya ikinci kez bildirme.
                if (excluded.Contains(recipientId)) continue;

                await _notificationService.CreateNotificationAsync(
                    recipientId,
                    NotificationType.Mention,
                    messageKey,
                    link: link,
                    actorUserId: actorUserId);
            }
        }
    }
}
