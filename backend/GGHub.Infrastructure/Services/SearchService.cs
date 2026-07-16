using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class SearchService : ISearchService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;

        // 4-haneli yıl token'ı (1900-2099). Query'den ayırılır; oyun ismi name'inde geçmeyebilir.
        private static readonly Regex YearTokenRegex = new(@"\b(19|20)\d{2}\b", RegexOptions.Compiled);

        public SearchService(GGHubDbContext context, IGameService gameService)
        {
            _context = context;
            _gameService = gameService;
        }

        public async Task<IEnumerable<SearchResultDto>> SearchAsync(string query, int? currentUserId = null)
        {
            var (nameQuery, year) = ParseQuery(query);
            var tokens = Tokenize(nameQuery);

            // Lokal DB araması: her token için ILIKE %token% AND ile birleşir. Yıl varsa Released YYYY ile başlar.
            IQueryable<Core.Entities.Game> gameQuery = _context.Games.AsNoTracking();
            foreach (var token in tokens)
            {
                var pattern = $"%{token}%";
                gameQuery = gameQuery.Where(g => EF.Functions.ILike(g.Name, pattern));
            }
            if (year.HasValue)
            {
                var yearStr = year.Value.ToString();
                gameQuery = gameQuery.Where(g => g.Released != null && g.Released.StartsWith(yearStr));
            }

            var localGames = await gameQuery
                .OrderByDescending(g => g.RawgAdded ?? 0)
                .Take(8)
                .Select(g => new SearchResultDto
                {
                    Type = "Oyun",
                    Id = g.Slug,
                    Title = g.Name,
                    ImageUrl = g.CoverImage ?? g.BackgroundImage,
                    Link = $"/games/{g.Slug}"
                })
                .ToListAsync();

            // Eğer lokal sonuç azsa, RAWG passthrough fallback'i ile (yine DB üzerinden) daha geniş arama
            // dene; nameQuery + GameQueryParams kullanılır. Yıl bilgisini RAWG service "Dates" param'ına çevirebilir.
            if (localGames.Count < 5 && tokens.Length > 0)
            {
                var rawgResults = await _gameService.GetGamesAsync(new GameQueryParams
                {
                    Search = nameQuery,
                    Page = 1,
                    PageSize = 5,
                });

                var seenSlugs = new HashSet<string>(localGames.Select(l => l.Id));
                var rawgGames = rawgResults.Items
                    .Where(g => !seenSlugs.Contains(g.Slug))
                    .Take(5 - localGames.Count)
                    .Select(g => new SearchResultDto
                    {
                        Type = "Oyun",
                        Id = g.Slug,
                        Title = g.Name,
                        ImageUrl = g.BackgroundImage,
                        Link = $"/games/{g.Slug}"
                    });

                localGames = localGames.Concat(rawgGames).ToList();
            }

            // Username araması — yıl token'larını username sorgusuna karıştırma; orijinal user input'u kullan.
            // Normalize edilmis anahtar uzerinden arama: "Ahmet" de "ahmetdemiroğlu" da dogru kisiyi bulur.
            // Contains semantigi korunuyor. Anahtar bosalirsa (ornegin sorgu tamamen Latin disi ise)
            // kullanici aramasi atlanir; aksi halde Contains("") HERKESI dondururdu.
            var lower = UsernameNormalizer.Normalize(query);
            var accessibleUsers = lower.Length == 0
                ? new List<SearchResultDto>()
                : await _context.Users
                .Where(u => u.UsernameNormalized!.Contains(lower) && !u.IsDeleted)
                .WhereVisibleTo(_context, currentUserId)
                .Take(5)
                .Select(u => new SearchResultDto
                {
                    Type = "Kullanıcı",
                    Id = u.Username,
                    Title = u.Username,
                    ImageUrl = u.ProfileImageUrl,
                    Link = $"/profiles/{u.Username}"
                })
                .ToListAsync();

            return localGames.Concat(accessibleUsers);
        }

        public async Task<IEnumerable<SearchResultDto>> SearchMessageableUsersAsync(string query, int currentUserId)
        {
            var blockedUserIds = await _context.UserBlocks
                .Where(b => b.BlockerId == currentUserId || b.BlockedId == currentUserId)
                .Select(b => b.BlockerId == currentUserId ? b.BlockedId : b.BlockerId)
                .ToListAsync();

            // Mesaj atılabilir kullanıcılar: engellenmemiş, mesajı kapalı olmayan ve
            // gizlilik kuralını sağlayan (herkes; ya da "takip edenler" ayarında beni
            // takip eden) kullanıcılar.
            var messageable = _context.Users
                .Where(u => !u.IsDeleted
                            && u.Id != currentUserId
                            && !blockedUserIds.Contains(u.Id)
                            && u.MessageSetting != MessagePrivacySetting.None)
                .Where(u =>
                    u.MessageSetting == MessagePrivacySetting.Everyone ||
                    (u.MessageSetting == MessagePrivacySetting.Following &&
                     _context.Follows.Any(f => f.FollowerId == u.Id && f.FolloweeId == currentUserId)));

            // Query boşsa öneri modu: takip ettiğim ve mesaj atabileceğim kullanıcılar.
            // Query doluysa kullanıcı adına göre arama.
            var isSuggestion = string.IsNullOrWhiteSpace(query);
            if (isSuggestion)
            {
                messageable = messageable
                    .Where(u => _context.Follows.Any(f => f.FollowerId == currentUserId && f.FolloweeId == u.Id));
            }
            else
            {
                // Normalize edilmis anahtar uzerinden ara: hem indexli, hem "Ahmet" yazinca
                // "ahmet"i bulur, hem de "ahmetdemiroglu" yazinca "ahmetdemiroğlu"yu bulur.
                // Eski hali kulture duyarli ToLower() idi: tr-TR'de "I" => "ı" olup sessizce bozuluyordu.
                var normalized = UsernameNormalizer.Normalize(query);
                if (normalized.Length > 0)
                {
                    messageable = messageable.Where(u => u.UsernameNormalized != null && u.UsernameNormalized.Contains(normalized));
                }
            }

            var results = await messageable
                .OrderBy(u => u.Username)
                .Take(isSuggestion ? 20 : 10)
                .Select(u => new SearchResultDto
                {
                    Type = "Kullanıcı",
                    Id = u.Username,
                    Title = u.Username,
                    ImageUrl = u.ProfileImageUrl,
                    Link = $"/messages/{u.Username}"
                })
                .ToListAsync();

            return results;
        }

        public async Task<IEnumerable<UserDto>> SearchMentionableUsersAsync(string query, int currentUserId, int limit = 8)
        {
            // Min uzunluk 1: search.minQueryLength (3) kurali burada BILEREK uygulanmiyor.
            // "@a" yazan kullanici ilk karakterden itibaren oneri gormeli.
            if (string.IsNullOrWhiteSpace(query)) return Array.Empty<UserDto>();

            // Normalize edilmis anahtar uzerinden arama: "@Ahmet" ve "@ahmetdemiroğlu" ayni kisiyi
            // bulur. Contains semantigi korunuyor, sadece eslesilen alan degisti.
            var lower = UsernameNormalizer.Normalize(query);
            if (lower.Length == 0) return Array.Empty<UserDto>();

            var candidates = _context.Users
                .AsNoTracking()
                .Where(u => !u.IsDeleted && !u.IsBanned && u.UsernameNormalized!.Contains(lower))
                .WhereVisibleTo(_context, currentUserId)
                .WhereNotBlockedWith(_context, currentUserId);

            // Siralama: once basi eslesenler, sonra takip ettiklerim, sonra takipci sayisi.
            // Username son kirici: ayni skorda sayfalama deterministik kalsin.
            var rows = await candidates
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.ProfileImageUrl,
                    u.FirstName,
                    u.LastName,
                    IsFollowing = _context.Follows.Any(f => f.FollowerId == currentUserId && f.FolloweeId == u.Id),
                    IsPrefixMatch = u.UsernameNormalized!.StartsWith(lower),
                    FollowerCount = u.Followers.Count
                })
                .OrderByDescending(x => x.IsPrefixMatch)
                .ThenByDescending(x => x.IsFollowing)
                .ThenByDescending(x => x.FollowerCount)
                .ThenBy(x => x.Username)
                .Take(limit)
                .ToListAsync();

            return rows.Select(x => new UserDto
            {
                Id = x.Id,
                Username = x.Username,
                ProfileImageUrl = x.ProfileImageUrl,
                FirstName = x.FirstName,
                LastName = x.LastName,
                IsFollowing = x.IsFollowing,
                // Yapisi geregi true: her satir zaten WhereVisibleTo + WhereNotBlockedWith kapisindan gecti.
                IsProfileAccessible = true
            }).ToList();
        }

        private static (string nameQuery, int? year) ParseQuery(string raw)
        {
            var match = YearTokenRegex.Match(raw);
            if (!match.Success) return (raw.Trim(), null);
            var year = int.Parse(match.Value);
            var stripped = (raw.Substring(0, match.Index) + raw.Substring(match.Index + match.Length)).Trim();
            // Aynı sorguda peş peşe boşluk kalmasın
            stripped = Regex.Replace(stripped, "\\s+", " ");
            return (stripped, year);
        }

        private static string[] Tokenize(string nameQuery)
        {
            if (string.IsNullOrWhiteSpace(nameQuery)) return System.Array.Empty<string>();
            return nameQuery
                .Split(new[] { ' ', '\t' }, System.StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length >= 2)
                .ToArray();
        }
    }
}
