using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Application.Localization;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class PostService : IPostService
    {
        /// <summary>Kullaniciya gorunen azami uzunluk. Token'lar cozuldukten SONRA olculur.</summary>
        private const int MaxVisibleLength = 200;
        private const int MaxImages = 4;
        private const int MinPollOptions = 2;
        private const int MaxPollOptions = 4;
        private const int MinPollDays = 1;
        private const int MaxPollDays = 7;

        private readonly GGHubDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IMentionService _mentionService;
        private readonly IUserDtoEnricher _userDtoEnricher;

        public PostService(
            GGHubDbContext context,
            INotificationService notificationService,
            IMentionService mentionService,
            IUserDtoEnricher userDtoEnricher)
        {
            _context = context;
            _notificationService = notificationService;
            _mentionService = mentionService;
            _userDtoEnricher = userDtoEnricher;
        }

        // ------------------------------------------------------------------
        // Olusturma
        // ------------------------------------------------------------------

        public async Task<PostDto> CreateAsync(int userId, PostForCreationDto dto)
        {
            var content = string.IsNullOrWhiteSpace(dto.Content) ? null : dto.Content.Trim();
            var imageUrls = (dto.ImageUrls ?? new List<string>())
                .Where(u => !string.IsNullOrWhiteSpace(u))
                .Take(MaxImages + 1)
                .ToList();

            if (imageUrls.Count > MaxImages)
                throw new InvalidOperationException(AppValidationText.PostImageCount);

            var hasPoll = dto.Poll != null && dto.Poll.Options.Count > 0;
            if (content == null && imageUrls.Count == 0 && !hasPoll)
                throw new InvalidOperationException(AppValidationText.PostEmpty);

            // Yanit dogrulamasi. Yanit ZINCIRI BILEREK tek seviye: yanita yanit
            // verilemez. X'te de yanitlar tek bir iplik altinda duz duruyor;
            // agac yapisi mobilde girinti kabusu ve sayfalama karmasasi yaratirdi.
            Post? parent = null;
            if (dto.ParentPostId.HasValue)
            {
                parent = await _context.Posts
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Id == dto.ParentPostId.Value);

                if (parent == null)
                    throw new KeyNotFoundException(AppText.Get("post.parentNotFound"));

                if (parent.ParentPostId.HasValue)
                    throw new InvalidOperationException(AppText.Get("post.replyToReplyNotAllowed"));

                // Goremedigin gonderiyi yanitlayamazsin.
                var (canViewParent, viewerFollowsParentAuthor, parentAuthorFollowsViewer) =
                    await EvaluateAccessAsync(parent.User, userId);

                if (!canViewParent)
                    throw new KeyNotFoundException(AppText.Get("post.notFound"));

                if (!PostAccess.CanReply(
                        parent.User.PostReplyPermission,
                        parent.UserId,
                        userId,
                        viewerFollowsParentAuthor,
                        parentAuthorFollowsViewer))
                {
                    throw new UnauthorizedAccessException(AppText.Get("post.replyNotAllowed"));
                }
            }

            // Etiketleri COZ. Bu ayni zamanda gorunen uzunluk hesabinin girdisi:
            // token "@[g:12345]" 11 karakter ama ekranda "@Elden Ring" 11 karakter
            // gorunuyor; ikisi ayni olmak zorunda degil, bu yuzden ayri olculuyor.
            var parsed = MentionTokens.Parse(content);
            var resolved = await ResolveMentionTargetsAsync(parsed, userId);

            var displayLengths = parsed
                .Select(p => resolved.TryGetValue((p.Type, p.TargetId), out var r) ? r.Display.Length : 0)
                .ToList();

            if (MentionTokens.VisibleLength(content, displayLengths) > MaxVisibleLength)
                throw new InvalidOperationException(AppValidationText.PostContentLength);

            if (dto.Poll != null)
            {
                var options = dto.Poll.Options
                    .Select(o => o?.Trim() ?? string.Empty)
                    .Where(o => o.Length > 0)
                    .ToList();

                if (options.Count < MinPollOptions || options.Count > MaxPollOptions)
                    throw new InvalidOperationException(AppValidationText.PollOptionCount);

                if (options.Any(o => o.Length > 40))
                    throw new InvalidOperationException(AppValidationText.PollOptionLength);

                if (dto.Poll.DurationDays < MinPollDays || dto.Poll.DurationDays > MaxPollDays)
                    throw new InvalidOperationException(AppValidationText.PollDurationRange);
            }

            var post = new Post
            {
                UserId = userId,
                Content = content,
                ParentPostId = dto.ParentPostId,
                CreatedAt = DateTime.UtcNow
            };

            for (var i = 0; i < imageUrls.Count; i++)
                post.Images.Add(new PostImage { Url = imageUrls[i], Position = i });

            foreach (var p in parsed)
            {
                // Cozulemeyen token icin satir YAZILMAZ: silinmis oyuna FK
                // yazamayiz ve zaten okuma aninda duz metne dusecek.
                if (!resolved.ContainsKey((p.Type, p.TargetId))) continue;

                post.Mentions.Add(new PostMention
                {
                    TargetType = p.Type,
                    TargetUserId = p.Type == MentionTargetType.User ? p.TargetId : null,
                    TargetGameId = p.Type == MentionTargetType.Game ? p.TargetId : null,
                    TargetListId = p.Type == MentionTargetType.List ? p.TargetId : null,
                    Position = p.Position,
                    Length = p.Length
                });
            }

            if (dto.Poll != null)
            {
                var poll = new PostPoll
                {
                    EndsAt = DateTime.UtcNow.AddDays(dto.Poll.DurationDays),
                    CreatedAt = DateTime.UtcNow
                };

                var position = 0;
                foreach (var text in dto.Poll.Options.Select(o => o?.Trim() ?? string.Empty).Where(o => o.Length > 0))
                    poll.Options.Add(new PostPollOption { Text = text, Position = position++ });

                post.Poll = poll;
            }

            _context.Posts.Add(post);

            // Yanit sayaci ana gonderiyle AYNI SaveChanges icinde artiyor;
            // ayri cagri olsaydi arada bir hata sayaci kalici olarak kaydirirdi.
            if (parent != null) parent.ReplyCount += 1;

            await _context.SaveChangesAsync();

            await NotifyOnCreateAsync(post, parent, userId, parsed, resolved);

            return await GetByIdAsync(post.Id, userId);
        }

        /// <summary>
        /// Yanit ve etiket bildirimleri. Ana yazariyi da etiketleyen bir yanit
        /// IKI degil TEK bildirim uretmeli; ReviewCommentService'teki
        /// excludeUserIds deseninin aynisi.
        /// </summary>
        private async Task NotifyOnCreateAsync(
            Post post,
            Post? parent,
            int actorUserId,
            IReadOnlyList<MentionTokens.ParsedMention> parsed,
            IReadOnlyDictionary<(MentionTargetType, int), ResolvedMention> resolved)
        {
            int? notifiedUserId = null;

            if (parent != null && parent.UserId != actorUserId)
            {
                await _notificationService.CreateNotificationAsync(
                    parent.UserId,
                    NotificationType.PostReply,
                    "post.replyNotification",
                    link: $"/posts/{parent.Id}",
                    actorUserId: actorUserId);
                notifiedUserId = parent.UserId;
            }

            var mentionedUserIds = parsed
                .Where(p => p.Type == MentionTargetType.User && resolved.ContainsKey((p.Type, p.TargetId)))
                .Select(p => p.TargetId)
                .Distinct()
                .ToList();

            if (mentionedUserIds.Count == 0) return;

            // GORUNURLUK KAPISI: etiketlenen kisi gonderiyi GERCEKTEN goremiyorsa
            // bildirim gonderilmez. Aksi halde "seni etiketledi" bildirimine
            // dokunan kullanici 404 alirdi; ayrica gizli gonderinin varligi
            // sizardi. MentionService bu kurali bilemez, gonderiyi tanimiyor.
            var eligible = await FilterMentionRecipientsAsync(actorUserId, mentionedUserIds);
            if (eligible.Count == 0) return;

            await _mentionService.NotifyUserIdsAsync(
                actorUserId,
                eligible,
                "post.mentionNotification",
                $"/posts/{post.Id}",
                excludeUserIds: notifiedUserId.HasValue ? new[] { notifiedUserId.Value } : null);
        }

        /// <summary>
        /// Etiket bildirimi alabilecek kullanicilari gonderi gorunurluguene gore
        /// suzer. Yazarin ayarina bakilir cunku gizlilik gonderide degil
        /// kullanicida tutuluyor (canli ayar).
        /// </summary>
        private async Task<List<int>> FilterMentionRecipientsAsync(int authorId, List<int> candidateIds)
        {
            var author = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == authorId)
                .Select(u => new { u.PostVisibility, u.ProfileVisibility })
                .FirstOrDefaultAsync();

            if (author == null) return new List<int>();

            // Yalnizca ben gorebiliyorum: kimseye etiket bildirimi gitmez.
            if (author.PostVisibility == PostVisibilitySetting.Private ||
                author.ProfileVisibility == ProfileVisibilitySetting.Private)
            {
                return new List<int>();
            }

            var needsFollow =
                author.PostVisibility == PostVisibilitySetting.Followers ||
                author.ProfileVisibility == ProfileVisibilitySetting.Followers;

            if (!needsFollow) return candidateIds;

            // Takipcilere acik: yalnizca yazari takip edenler bildirim alir.
            return await _context.Follows
                .AsNoTracking()
                .Where(f => f.FolloweeId == authorId && candidateIds.Contains(f.FollowerId))
                .Select(f => f.FollowerId)
                .ToListAsync();
        }

        // ------------------------------------------------------------------
        // Silme
        // ------------------------------------------------------------------

        public async Task DeleteAsync(int postId, int userId, bool isAdmin)
        {
            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId);
            if (post == null) throw new KeyNotFoundException(AppText.Get("post.notFound"));

            if (post.UserId != userId && !isAdmin)
                throw new UnauthorizedAccessException(AppText.Get("post.notOwner"));

            // Sayaclari geri al. Yanitlar ve repost'lar FK cascade ile gidiyor,
            // ama SILINEN kaydin kendisinin ust gonderideki sayaci elle dusmeli.
            if (post.ParentPostId.HasValue)
            {
                var parent = await _context.Posts.FirstOrDefaultAsync(p => p.Id == post.ParentPostId.Value);
                if (parent != null && parent.ReplyCount > 0) parent.ReplyCount -= 1;
            }

            if (post.RepostOfPostId.HasValue)
            {
                var source = await _context.Posts.FirstOrDefaultAsync(p => p.Id == post.RepostOfPostId.Value);
                if (source != null && source.RepostCount > 0) source.RepostCount -= 1;
            }

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();
        }

        // ------------------------------------------------------------------
        // Okuma
        // ------------------------------------------------------------------

        public async Task<PostDto> GetByIdAsync(int postId, int? currentUserId)
        {
            var post = await WithIncludes(_context.Posts.AsNoTracking())
                .WhereVisibleTo(_context, currentUserId)
                .FirstOrDefaultAsync(p => p.Id == postId);

            // Erisim yoksa 403 DEGIL 404: 403 gonderinin var oldugunu sizdirirdi.
            if (post == null) throw new KeyNotFoundException(AppText.Get("post.notFound"));

            var mapped = await MapAsync(new List<Post> { post }, currentUserId);
            return mapped[0];
        }

        public async Task<PaginatedResult<PostDto>> GetRepliesAsync(
            int postId, int? currentUserId, ListQueryParams queryParams)
        {
            // Once ana gonderiye erisim; goremedigin gonderinin yanitlarini da goremezsin.
            var parentVisible = await _context.Posts
                .AsNoTracking()
                .WhereVisibleTo(_context, currentUserId)
                .AnyAsync(p => p.Id == postId);

            if (!parentVisible) throw new KeyNotFoundException(AppText.Get("post.notFound"));

            // HER YANIT kendi yazarina gore ayrica suzuluyor: ana gonderi herkese
            // acik olsa da engelledigim ya da gizli profilli birinin yaniti bana
            // gorunmemeli.
            var query = _context.Posts
                .AsNoTracking()
                .Where(p => p.ParentPostId == postId)
                .WhereVisibleTo(_context, currentUserId);

            var totalCount = await query.CountAsync();

            var replies = await WithIncludes(query)
                .OrderBy(p => p.CreatedAt)
                .Skip((queryParams.Page - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .ToListAsync();

            return new PaginatedResult<PostDto>
            {
                Items = await MapAsync(replies, currentUserId),
                TotalCount = totalCount,
                Page = queryParams.Page,
                PageSize = queryParams.PageSize
            };
        }

        public async Task<IEnumerable<PostDto>> GetUserPostsAsync(
            string username, int? currentUserId, int limit, DateTime? cursor)
        {
            if (limit <= 0) limit = 20;
            if (limit > 50) limit = 50;

            // Profil icerigi kapisi (engel + profil gorunurlugu) once uygulanir;
            // diger profil sekmeleriyle ayni giris noktasi.
            var user = await ProfileContentAccess.GetViewableUserAsync(_context, username, currentUserId);
            if (user == null) return Array.Empty<PostDto>();

            var query = _context.Posts
                .AsNoTracking()
                .Where(p => p.UserId == user.Id)
                .WhereRootLevel()
                .WhereVisibleTo(_context, currentUserId);

            query = ApplyCursor(query, cursor);

            var posts = await WithIncludes(query)
                .OrderByDescending(p => p.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return await MapAsync(posts, currentUserId);
        }

        /// <summary>
        /// Npgsql timestamptz icin UTC Kind zorunlu; query-string binding
        /// Local/Unspecified verebilir. ActivityService'teki ayni duzeltme.
        /// </summary>
        internal static IQueryable<Post> ApplyCursor(IQueryable<Post> query, DateTime? cursor)
        {
            if (!cursor.HasValue) return query;

            var value = cursor.Value.Kind switch
            {
                DateTimeKind.Utc => cursor.Value,
                DateTimeKind.Local => cursor.Value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(cursor.Value, DateTimeKind.Utc)
            };

            return query.Where(p => p.CreatedAt < value);
        }

        // ------------------------------------------------------------------
        // Etkilesimler
        // ------------------------------------------------------------------

        public async Task<PostInteractionResultDto> SetLikeAsync(int postId, int userId, bool liked)
        {
            var post = await LoadVisiblePostForWriteAsync(postId, userId);

            var existing = await _context.PostLikes
                .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

            if (liked && existing == null)
            {
                _context.PostLikes.Add(new PostLike { PostId = postId, UserId = userId });
                post.LikeCount += 1;
                await _context.SaveChangesAsync();

                if (post.UserId != userId)
                {
                    await _notificationService.CreateNotificationAsync(
                        post.UserId,
                        NotificationType.PostLike,
                        "post.likeNotification",
                        link: $"/posts/{post.Id}",
                        actorUserId: userId);
                }
            }
            else if (!liked && existing != null)
            {
                _context.PostLikes.Remove(existing);
                if (post.LikeCount > 0) post.LikeCount -= 1;
                await _context.SaveChangesAsync();
            }

            return await BuildInteractionResultAsync(post, userId);
        }

        public async Task<PostInteractionResultDto> SetRepostAsync(int postId, int userId, bool reposted)
        {
            var post = await LoadVisiblePostForWriteAsync(postId, userId);

            if (post.ParentPostId.HasValue)
                throw new InvalidOperationException(AppText.Get("post.cannotRepostReply"));

            // Zincirin ucunu tek seviyede tut: bir repost'u repost etmek kaynagi repost eder.
            var targetId = post.RepostOfPostId ?? post.Id;
            var target = post.RepostOfPostId.HasValue
                ? await _context.Posts.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == targetId)
                : post;

            if (target == null) throw new KeyNotFoundException(AppText.Get("post.notFound"));

            var existing = await _context.Posts
                .FirstOrDefaultAsync(p => p.UserId == userId && p.RepostOfPostId == targetId);

            if (reposted && existing == null)
            {
                // SIZINTI KAPISI: repost, iceriği orijinal yazarin onaylamadigi bir
                // kitleye tasiyor. Bu yuzden yalnizca TAM ACIK gonderiler repost
                // edilebilir; "ben gorebiliyorum" yeterli degil, cunku repost'u
                // gorecek olan benim kitlem.
                if (target.User.PostVisibility != PostVisibilitySetting.Everyone ||
                    target.User.ProfileVisibility != ProfileVisibilitySetting.Public)
                {
                    throw new InvalidOperationException(AppText.Get("post.repostNotAllowed"));
                }

                _context.Posts.Add(new Post
                {
                    UserId = userId,
                    Content = null,
                    RepostOfPostId = targetId,
                    CreatedAt = DateTime.UtcNow
                });
                target.RepostCount += 1;
                await _context.SaveChangesAsync();

                if (target.UserId != userId)
                {
                    await _notificationService.CreateNotificationAsync(
                        target.UserId,
                        NotificationType.PostRepost,
                        "post.repostNotification",
                        link: $"/posts/{target.Id}",
                        actorUserId: userId);
                }
            }
            else if (!reposted && existing != null)
            {
                _context.Posts.Remove(existing);
                if (target.RepostCount > 0) target.RepostCount -= 1;
                await _context.SaveChangesAsync();
            }

            return await BuildInteractionResultAsync(target, userId);
        }

        public async Task<PostPollDto> VotePollAsync(int postId, int userId, int optionId)
        {
            var post = await LoadVisiblePostForWriteAsync(postId, userId);

            var poll = await _context.PostPolls
                .Include(p => p.Options)
                .FirstOrDefaultAsync(p => p.PostId == postId);

            if (poll == null) throw new KeyNotFoundException(AppText.Get("post.pollOptionNotFound"));

            if (poll.EndsAt <= DateTime.UtcNow)
                throw new InvalidOperationException(AppText.Get("post.pollClosed"));

            var option = poll.Options.FirstOrDefault(o => o.Id == optionId);
            if (option == null) throw new KeyNotFoundException(AppText.Get("post.pollOptionNotFound"));

            // Bilesik PK (UserId, PollId) zaten ikinci oyu veritabaninda
            // reddeder; buradaki kontrol kullaniciya duzgun bir mesaj vermek icin.
            var already = await _context.PostPollVotes
                .AnyAsync(v => v.PollId == poll.Id && v.UserId == userId);

            if (already) throw new InvalidOperationException(AppText.Get("post.pollAlreadyVoted"));

            _context.PostPollVotes.Add(new PostPollVote
            {
                UserId = userId,
                PollId = poll.Id,
                OptionId = optionId
            });
            option.VoteCount += 1;

            await _context.SaveChangesAsync();

            return BuildPollDto(poll, optionId);
        }

        /// <summary>
        /// Tek bir yazara karsi gorunurluk ve iki takip yonunu birlikte cozer.
        /// Yanit yazma yolunda kullanilir; liste yollari EF filtresini
        /// (PostQueryExtensions.WhereVisibleTo) kullanir, burasi tekil kontrol.
        /// </summary>
        private async Task<(bool CanView, bool ViewerFollowsAuthor, bool AuthorFollowsViewer)>
            EvaluateAccessAsync(User author, int viewerId)
        {
            if (author.Id == viewerId) return (true, false, false);

            var isBlocked = await _context.UserBlocks
                .AsNoTracking()
                .AnyAsync(b =>
                    (b.BlockerId == viewerId && b.BlockedId == author.Id) ||
                    (b.BlockerId == author.Id && b.BlockedId == viewerId));

            if (isBlocked) return (false, false, false);

            var viewerFollowsAuthor = await _context.Follows
                .AsNoTracking()
                .AnyAsync(f => f.FollowerId == viewerId && f.FolloweeId == author.Id);

            var authorFollowsViewer = await _context.Follows
                .AsNoTracking()
                .AnyAsync(f => f.FollowerId == author.Id && f.FolloweeId == viewerId);

            var canView = PostAccess.CanView(author, viewerId, viewerFollowsAuthor);

            return (canView, viewerFollowsAuthor, authorFollowsViewer);
        }

        /// <summary>
        /// Yazma islemleri icin gonderiyi TAKIPLI (tracked) yukler ve gorunurluk
        /// kapisini uygular. Goremedigin gonderiyi begenemez, repost edemez,
        /// anketine oy veremezsin.
        /// </summary>
        private async Task<Post> LoadVisiblePostForWriteAsync(int postId, int userId)
        {
            var visible = await _context.Posts
                .AsNoTracking()
                .WhereVisibleTo(_context, userId)
                .AnyAsync(p => p.Id == postId);

            if (!visible) throw new KeyNotFoundException(AppText.Get("post.notFound"));

            var post = await _context.Posts
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == postId);

            if (post == null) throw new KeyNotFoundException(AppText.Get("post.notFound"));
            return post;
        }

        private async Task<PostInteractionResultDto> BuildInteractionResultAsync(Post post, int userId)
        {
            var isLiked = await _context.PostLikes.AnyAsync(l => l.PostId == post.Id && l.UserId == userId);
            var isReposted = await _context.Posts.AnyAsync(p => p.UserId == userId && p.RepostOfPostId == post.Id);

            return new PostInteractionResultDto
            {
                PostId = post.Id,
                LikeCount = post.LikeCount,
                RepostCount = post.RepostCount,
                IsLiked = isLiked,
                IsReposted = isReposted
            };
        }

        // ------------------------------------------------------------------
        // Esleme (N+1 yok)
        // ------------------------------------------------------------------

        /// <summary>
        /// Kart cizimi icin gereken tum navigasyonlar. AsSplitQuery: tek
        /// sorguda birlestirilse gorseller x etiketler x anket secenekleri
        /// kartezyen carpimi olusur ve satir sayisi patlar.
        /// </summary>
        internal static IQueryable<Post> WithIncludes(IQueryable<Post> query) =>
            query
                .Include(p => p.User)
                .Include(p => p.Images)
                .Include(p => p.Mentions)
                .Include(p => p.Poll!).ThenInclude(poll => poll.Options)
                .Include(p => p.ParentPost!).ThenInclude(pp => pp.User)
                .Include(p => p.RepostOfPost!).ThenInclude(rp => rp.User)
                .Include(p => p.RepostOfPost!).ThenInclude(rp => rp.Images)
                .Include(p => p.RepostOfPost!).ThenInclude(rp => rp.Mentions)
                .Include(p => p.RepostOfPost!).ThenInclude(rp => rp.Poll!).ThenInclude(poll => poll.Options)
                .AsSplitQuery();

        internal readonly record struct ResolvedMention(string Display, string? Slug);

        /// <summary>
        /// Bir SAYFADAKI tum gonderileri DTO'ya cevirir. Sayfa basina sabit
        /// sayida sorgu calisir (etiket hedefleri 3, begeni 1, repost 1, anket
        /// oyu 1, takip iliskisi 2); gonderi sayisiyla ORANTILI sorgu yok.
        /// </summary>
        internal async Task<List<PostDto>> MapAsync(List<Post> posts, int? currentUserId)
        {
            if (posts.Count == 0) return new List<PostDto>();

            // Repost kaynaklari da cizilecek, onlar da havuza girer.
            // Repost kaynaklari da cizilecek, onlar da havuza girer.
            //
            // TEKILLESTIRME SART: ayni gonderi havuza IKI kez girebiliyor.
            //   a) Kendi gonderini repost edersen hem kok kayit hem repost'un
            //      kaynagi olarak sayfada bulunur.
            //   b) Iki farkli kisi ayni gonderiyi repost edip ikisi de sayfaya
            //      duserse kaynak yine iki kez gelir.
            // Bu olmadan asagidaki ToDictionary yinelenen anahtarda
            // ArgumentException firlatiyor ve TUM listeleme uclari 500 donuyordu
            // (tekil gonderi ve yanit uclari saglam gorunuyordu, cunku orada
            // yineleme hic olusmuyor).
            var all = new List<Post>(posts);
            all.AddRange(posts.Where(p => p.RepostOfPost != null).Select(p => p.RepostOfPost!));
            all = all.GroupBy(p => p.Id).Select(g => g.First()).ToList();

            var parsedByPost = all.ToDictionary(p => p.Id, p => MentionTokens.Parse(p.Content));
            var allParsed = parsedByPost.Values.SelectMany(v => v).ToList();
            var resolved = await ResolveMentionTargetsAsync(allParsed, currentUserId);

            var postIds = all.Select(p => p.Id).Distinct().ToList();
            var authorIds = all.Select(p => p.UserId).Distinct().ToList();
            var pollIds = all.Where(p => p.Poll != null).Select(p => p.Poll!.Id).ToList();

            var likedIds = new HashSet<int>();
            var repostedSourceIds = new HashSet<int>();
            var myPollVotes = new Dictionary<int, int>();
            var iFollow = new HashSet<int>();
            var followsMe = new HashSet<int>();

            if (currentUserId.HasValue)
            {
                likedIds = (await _context.PostLikes.AsNoTracking()
                    .Where(l => l.UserId == currentUserId.Value && postIds.Contains(l.PostId))
                    .Select(l => l.PostId)
                    .ToListAsync()).ToHashSet();

                repostedSourceIds = (await _context.Posts.AsNoTracking()
                    .Where(p => p.UserId == currentUserId.Value &&
                                p.RepostOfPostId != null &&
                                postIds.Contains(p.RepostOfPostId.Value))
                    .Select(p => p.RepostOfPostId!.Value)
                    .ToListAsync()).ToHashSet();

                if (pollIds.Count > 0)
                {
                    myPollVotes = await _context.PostPollVotes.AsNoTracking()
                        .Where(v => v.UserId == currentUserId.Value && pollIds.Contains(v.PollId))
                        .ToDictionaryAsync(v => v.PollId, v => v.OptionId);
                }

                // Yanit izni iki takip YONUNU de bilmek zorunda; ikisi ayri sorgu.
                iFollow = (await _context.Follows.AsNoTracking()
                    .Where(f => f.FollowerId == currentUserId.Value && authorIds.Contains(f.FolloweeId))
                    .Select(f => f.FolloweeId)
                    .ToListAsync()).ToHashSet();

                followsMe = (await _context.Follows.AsNoTracking()
                    .Where(f => f.FolloweeId == currentUserId.Value && authorIds.Contains(f.FollowerId))
                    .Select(f => f.FollowerId)
                    .ToListAsync()).ToHashSet();
            }

            var isAdmin = false;
            if (currentUserId.HasValue)
            {
                isAdmin = await _context.Users.AsNoTracking()
                    .Where(u => u.Id == currentUserId.Value)
                    .Select(u => u.Role == "Admin")
                    .FirstOrDefaultAsync();
            }

            PostDto Build(Post p, bool includeRepostSource)
            {
                var dto = new PostDto
                {
                    Id = p.Id,
                    Content = p.Content,
                    CreatedAt = p.CreatedAt,
                    Author = new UserDto
                    {
                        Id = p.User.Id,
                        Username = p.User.Username,
                        ProfileImageUrl = p.User.ProfileImageUrl,
                        FirstName = p.User.FirstName,
                        LastName = p.User.LastName
                    },
                    LikeCount = p.LikeCount,
                    ReplyCount = p.ReplyCount,
                    RepostCount = p.RepostCount,
                    IsLiked = likedIds.Contains(p.Id),
                    IsReposted = repostedSourceIds.Contains(p.Id),
                    CanReply = PostAccess.CanReply(
                        p.User.PostReplyPermission,
                        p.UserId,
                        currentUserId,
                        iFollow.Contains(p.UserId),
                        followsMe.Contains(p.UserId)),
                    CanDelete = currentUserId.HasValue && (p.UserId == currentUserId.Value || isAdmin),
                    ParentPostId = p.ParentPostId,
                    ParentAuthorUsername = p.ParentPost?.User?.Username,
                    Images = p.Images
                        .OrderBy(i => i.Position)
                        .Select(i => new PostImageDto
                        {
                            Url = i.Url,
                            Width = i.Width,
                            Height = i.Height,
                            Position = i.Position
                        })
                        .ToList(),
                    Mentions = BuildMentions(parsedByPost.TryGetValue(p.Id, out var mp) ? mp : Array.Empty<MentionTokens.ParsedMention>(), resolved),
                    Poll = p.Poll == null
                        ? null
                        : BuildPollDto(p.Poll, myPollVotes.TryGetValue(p.Poll.Id, out var opt) ? opt : null)
                };

                if (includeRepostSource && p.RepostOfPost != null)
                    dto.RepostOf = Build(p.RepostOfPost, includeRepostSource: false);

                return dto;
            }

            var result = posts.Select(p => Build(p, includeRepostSource: true)).ToList();

            // Yazar kartlarindaki IsFollowing / IsProfileAccessible tek turda dolduruluyor.
            var users = result.Select(r => r.Author).ToList();
            users.AddRange(result.Where(r => r.RepostOf != null).Select(r => r.RepostOf!.Author));
            await _userDtoEnricher.EnrichAsync(users, currentUserId);

            return result;
        }

        private static List<PostMentionDto> BuildMentions(
            IReadOnlyList<MentionTokens.ParsedMention> parsed,
            IReadOnlyDictionary<(MentionTargetType, int), ResolvedMention> resolved)
        {
            var list = new List<PostMentionDto>(parsed.Count);

            foreach (var p in parsed)
            {
                var hit = resolved.TryGetValue((p.Type, p.TargetId), out var r);
                list.Add(new PostMentionDto
                {
                    Type = p.Type,
                    Id = p.TargetId,
                    Display = hit ? r.Display : string.Empty,
                    Slug = hit ? r.Slug : null,
                    Resolved = hit
                });
            }

            return list;
        }

        private static PostPollDto BuildPollDto(PostPoll poll, int? myOptionId)
        {
            var options = poll.Options
                .OrderBy(o => o.Position)
                .Select(o => new PostPollOptionDto
                {
                    Id = o.Id,
                    Text = o.Text,
                    Position = o.Position,
                    VoteCount = o.VoteCount
                })
                .ToList();

            return new PostPollDto
            {
                Id = poll.Id,
                EndsAt = poll.EndsAt,
                IsClosed = poll.EndsAt <= DateTime.UtcNow,
                TotalVotes = options.Sum(o => o.VoteCount),
                MyOptionId = myOptionId,
                Options = options
            };
        }

        /// <summary>
        /// Etiket hedeflerini toplu cozer: kisi, oyun, liste icin TEK'er sorgu.
        ///
        /// GIZLILIK: cozumleme goruntuleyene gore yapiliyor. Gizli profilli bir
        /// kisiyi ya da ozel bir listeyi etiketleyip herkese acik gonderi atmak,
        /// o kisinin adini / listenin adini sizdirmamali. Cozulemeyen etiket
        /// istemcide duz gri metne duser.
        /// </summary>
        private async Task<Dictionary<(MentionTargetType, int), ResolvedMention>> ResolveMentionTargetsAsync(
            IReadOnlyList<MentionTokens.ParsedMention> parsed,
            int? viewerId)
        {
            var map = new Dictionary<(MentionTargetType, int), ResolvedMention>();
            if (parsed.Count == 0) return map;

            var userIds = parsed.Where(p => p.Type == MentionTargetType.User).Select(p => p.TargetId).Distinct().ToList();
            var gameIds = parsed.Where(p => p.Type == MentionTargetType.Game).Select(p => p.TargetId).Distinct().ToList();
            var listIds = parsed.Where(p => p.Type == MentionTargetType.List).Select(p => p.TargetId).Distinct().ToList();

            if (userIds.Count > 0)
            {
                var userQuery = _context.Users
                    .AsNoTracking()
                    .Where(u => userIds.Contains(u.Id) && !u.IsDeleted && !u.IsBanned)
                    .WhereVisibleTo(_context, viewerId);

                if (viewerId.HasValue)
                    userQuery = userQuery.WhereNotBlockedWith(_context, viewerId.Value);

                foreach (var u in await userQuery.Select(u => new { u.Id, u.Username }).ToListAsync())
                    map[(MentionTargetType.User, u.Id)] = new ResolvedMention(u.Username, u.Username);
            }

            if (gameIds.Count > 0)
            {
                // Oyunlar herkese acik katalog; gorunurluk suzgeci yok.
                foreach (var g in await _context.Games.AsNoTracking()
                             .Where(g => gameIds.Contains(g.Id))
                             .Select(g => new { g.Id, g.Name, g.Slug })
                             .ToListAsync())
                {
                    map[(MentionTargetType.Game, g.Id)] = new ResolvedMention(g.Name, g.Slug);
                }
            }

            if (listIds.Count > 0)
            {
                // Liste gorunurlugu: herkese acik, kendi listem, ya da
                // takipcilere acik olup sahibini takip ediyorum.
                var listQuery = _context.UserLists
                    .AsNoTracking()
                    .Where(l => listIds.Contains(l.Id))
                    .Where(l =>
                        l.Visibility == ListVisibilitySetting.Public ||
                        l.UserId == viewerId ||
                        (l.Visibility == ListVisibilitySetting.Followers &&
                         viewerId != null &&
                         _context.Follows.Any(f => f.FolloweeId == l.UserId && f.FollowerId == viewerId)));

                foreach (var l in await listQuery.Select(l => new { l.Id, l.Name }).ToListAsync())
                    map[(MentionTargetType.List, l.Id)] = new ResolvedMention(l.Name, l.Id.ToString());
            }

            return map;
        }
    }
}
