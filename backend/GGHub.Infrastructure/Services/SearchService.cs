using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class SearchService : ISearchService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;

        public SearchService(GGHubDbContext context, IGameService gameService)
        {
            _context = context;
            _gameService = gameService;
        }

        public async Task<IEnumerable<SearchResultDto>> SearchAsync(string query, int? currentUserId = null)
        {
            var localGames = (await RankGamesAsync(query, 8))
                .Select(g => new SearchResultDto
                {
                    Type = "Oyun",
                    Id = g.Slug,
                    Title = g.Name,
                    Subtitle = g.Year,
                    ImageUrl = g.CoverImage ?? g.BackgroundImage,
                    Link = $"/games/{g.Slug}"
                })
                .ToList();

            // Katalogda neredeyse hic sonuc yoksa GetGamesAsync'in Steam/IGDB anlik ingest'ine
            // birak (katalogda olmayan oyunu oradan getirir). Iyi eslesme varken tetiklenmez;
            // aksi halde her aramada Steam'in hayran yapimi coplerini kataloga cekiyordu.
            if (localGames.Count < 3 && !GameSearch.Parse(query).IsEmpty)
            {
                var rawgResults = await _gameService.GetGamesAsync(new GameQueryParams
                {
                    Search = query,
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
                        Subtitle = g.Released != null && g.Released.Length >= 4 ? g.Released[..4] : null,
                        ImageUrl = g.BackgroundImage,
                        Link = $"/games/{g.Slug}"
                    });

                localGames = localGames.Concat(rawgGames).ToList();
            }

            // Username araması: yıl token'larını username sorgusuna karıştırma; orijinal user input'u kullan.
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
                    u.IsAiAgent,
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
                IsAiAgent = x.IsAiAgent,
                // Yapisi geregi true: her satir zaten WhereVisibleTo + WhereNotBlockedWith kapisindan gecti.
                IsProfileAccessible = true
            }).ToList();
        }

        public async Task<IEnumerable<MentionSuggestionDto>> SearchMentionTargetsAsync(
            string query, int currentUserId, IReadOnlyCollection<MentionTargetType> types, int limit = 8)
        {
            if (string.IsNullOrWhiteSpace(query)) return Array.Empty<MentionSuggestionDto>();
            if (types.Count == 0) return Array.Empty<MentionSuggestionDto>();

            var results = new List<MentionSuggestionDto>();
            var raw = query.Trim();

            if (types.Contains(MentionTargetType.User))
            {
                // Kisi aramasi mevcut yolu AYNEN kullanir; gizlilik ve engel
                // kapilari orada zaten uygulaniyor, ikinci bir kopya sapabilirdi.
                var users = await SearchMentionableUsersAsync(raw, currentUserId, limit);
                results.AddRange(users.Select(u => new MentionSuggestionDto
                {
                    Type = MentionTargetType.User,
                    Id = u.Id,
                    Display = u.Username,
                    ImageUrl = u.ProfileImageUrl,
                    Subtitle = string.Join(" ", new[] { u.FirstName, u.LastName }
                        .Where(s => !string.IsNullOrWhiteSpace(s)))
                }));
            }

            if (types.Contains(MentionTargetType.Game))
            {
                // Oyunlar herkese acik katalog: gorunurluk suzgeci yok. Ust cubuk aramasiyla
                // ayni motor: "@gta 6" de Grand Theft Auto VI'yi onerir.
                var games = await RankGamesAsync(raw, limit);

                results.AddRange(games.Select(g => new MentionSuggestionDto
                {
                    Type = MentionTargetType.Game,
                    Id = g.Id,
                    Display = g.Name,
                    ImageUrl = g.CoverImage ?? g.BackgroundImage,
                    Subtitle = g.Year
                }));
            }

            if (types.Contains(MentionTargetType.List))
            {
                // Liste gorunurlugu: herkese acik, kendi listem, ya da takipcilere
                // acik olup sahibini takip ediyorum. Ozel listeler HIC onerilmez;
                // aksi halde adlari composer'da sizardi.
                var lowered = raw.ToLower();
                var lists = await _context.UserLists
                    .AsNoTracking()
                    .Where(l => l.Name.ToLower().Contains(lowered) && l.Type == UserListType.Custom)
                    .Where(l => !l.User.IsDeleted && !l.User.IsBanned)
                    .Where(l =>
                        l.Visibility == ListVisibilitySetting.Public ||
                        l.UserId == currentUserId ||
                        (l.Visibility == ListVisibilitySetting.Followers &&
                         _context.Follows.Any(f => f.FolloweeId == l.UserId && f.FollowerId == currentUserId)))
                    .Where(l => !_context.UserBlocks.Any(b =>
                        (b.BlockerId == currentUserId && b.BlockedId == l.UserId) ||
                        (b.BlockerId == l.UserId && b.BlockedId == currentUserId)))
                    .Select(l => new
                    {
                        l.Id,
                        l.Name,
                        OwnerUsername = l.User.Username,
                        FollowerCount = l.Followers.Count,
                        IsPrefixMatch = l.Name.ToLower().StartsWith(lowered)
                    })
                    .OrderByDescending(l => l.IsPrefixMatch)
                    .ThenByDescending(l => l.FollowerCount)
                    .ThenBy(l => l.Name)
                    .Take(limit)
                    .ToListAsync();

                results.AddRange(lists.Select(l => new MentionSuggestionDto
                {
                    Type = MentionTargetType.List,
                    Id = l.Id,
                    Display = l.Name,
                    Subtitle = l.OwnerUsername
                }));
            }

            return results;
        }

        /// <summary>
        /// Oyun aramasi, uc kademe:
        ///   1) Kelime basi eslesmesi (ad + kisaltma + rakam karsiliklari), en iyi 80 aday.
        ///   2) Neredeyse sonuc yoksa adin icinde harf dizisi ("craft" -> "Minecraft").
        ///   3) Hala yoksa yazim hatasi toleransi (pg_trgm word_similarity: "witcer" -> "Witcher").
        /// Adaylar GameSearch.Score ile siralanir: uyum + populerlik.
        /// </summary>
        private async Task<List<GameSearch.Candidate>> RankGamesAsync(string query, int limit)
        {
            var parsed = GameSearch.Parse(query);
            if (parsed.IsEmpty) return new List<GameSearch.Candidate>();

            var exactPrefix = GameSearch.ExactNamePrefix(parsed);
            var candidates = await GameSearch.Project(
                    GameSearch.WhereMatches(_context.Games.AsNoTracking(), parsed.Tokens)
                        .OrderByDescending(g => g.SearchText != null && g.SearchText.StartsWith(exactPrefix))
                        .ThenByDescending(g => g.HypeScore)
                        .ThenByDescending(g => g.RawgAdded ?? 0))
                .Take(80)
                .ToListAsync();

            if (candidates.Count < 3)
            {
                var seen = candidates.Select(c => c.Id).ToList();
                var substringQuery = _context.Games.AsNoTracking().Where(g => !seen.Contains(g.Id));
                var usable = parsed.Tokens.Where(t => t.Length >= 2).ToList();
                if (usable.Count > 0)
                {
                    foreach (var token in usable)
                    {
                        var pattern = $"%{token}%";
                        substringQuery = substringQuery.Where(g => EF.Functions.ILike(g.Name, pattern));
                    }

                    candidates.AddRange(await GameSearch.Project(substringQuery
                            .OrderByDescending(g => g.HypeScore)
                            .ThenByDescending(g => g.RawgAdded ?? 0))
                        .Take(20)
                        .ToListAsync());
                }
            }

            var ranked = candidates
                .Select(c => (Candidate: c, Score: GameSearch.Score(c, parsed)))
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Candidate.Name.Length)
                .Select(x => x.Candidate)
                .Take(limit)
                .ToList();

            if (ranked.Count < 3 && parsed.NormalizedQuery.Length >= 4)
            {
                ranked.AddRange((await FuzzyCandidatesAsync(parsed, ranked.Select(r => r.Id).ToList()))
                    .Take(limit - ranked.Count));
            }

            return ranked;
        }

        /// <summary>
        /// Yazim hatasi toleransi. pg_trgm eklentisi yoksa (ya da sorgu patlarsa) bos doner;
        /// arama asla bu yuzden dusmez.
        /// </summary>
        private async Task<List<GameSearch.Candidate>> FuzzyCandidatesAsync(GameSearch.ParsedQuery parsed, List<int> exclude)
        {
            try
            {
                var q = parsed.NormalizedQuery;
                // "<%" trigram indeksini kullanir (olculdu: 150 bin satirda <1 ms; indekssiz
                // word_similarity() >= x tam tarama 300 ms). Varsayilan esik 0.6 "witcer 3" ->
                // "witcher 3"u (0.58) kaciriyordu; esik yalniz bu islem icin (set_config local) 0.45.
                // Execution strategy: baglam retry ile kuruluysa dogrudan BeginTransaction atar.
                var strategy = _context.Database.CreateExecutionStrategy();
                var ids = await strategy.ExecuteAsync(async () =>
                {
                    await using var tx = await _context.Database.BeginTransactionAsync();
                    await _context.Database.ExecuteSqlRawAsync(
                        "SELECT set_config('pg_trgm.word_similarity_threshold', '0.45', true)");
                    var found = await _context.Database
                        .SqlQuery<int>($@"SELECT ""Id"" AS ""Value"" FROM ""Games""
                            WHERE ""SearchText"" IS NOT NULL AND {q} <% ""SearchText""
                            ORDER BY word_similarity({q}, ""SearchText"") DESC, ""HypeScore"" DESC
                            LIMIT 12")
                        .ToListAsync();
                    await tx.CommitAsync();
                    return found;
                });

                ids = ids.Where(id => !exclude.Contains(id)).ToList();
                if (ids.Count == 0) return new List<GameSearch.Candidate>();

                var rows = await GameSearch.Project(_context.Games.AsNoTracking().Where(g => ids.Contains(g.Id)))
                    .ToListAsync();
                // Esigi gecenler zaten benzer; aralarinda bilinen oyun one ("witcer 3" -> asil oyun,
                // "Remastered" / "REDkit" degil).
                return rows.OrderByDescending(GameSearch.Popularity).ToList();
            }
            catch (Exception)
            {
                return new List<GameSearch.Candidate>();
            }
        }
    }
}
