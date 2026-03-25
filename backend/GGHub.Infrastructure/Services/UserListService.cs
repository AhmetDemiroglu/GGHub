using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class UserListService : IUserListService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;
        private readonly INotificationService _notificationService;
        private readonly IGamificationService _gamificationService;

        public UserListService(GGHubDbContext context, IGameService gameService, INotificationService notificationService, IGamificationService gamificationService)
        {
            _context = context;
            _gameService = gameService;
            _notificationService = notificationService;
            _gamificationService = gamificationService;
        }

        public async Task<UserList> CreateListAsync(UserListForCreationDto listDto, int userId)
        {
            var existingList = await _context.UserLists
                .AnyAsync(l => l.UserId == userId && l.Name.ToLower() == listDto.Name.ToLower());

            if (existingList)
            {
                throw new InvalidOperationException("Bu isimde bir listeniz zaten mevcut.");
            }

            var userList = new UserList
            {
                Name = listDto.Name,
                Description = listDto.Description,
                Visibility = listDto.Visibility,
                Category = listDto.Category,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.UserLists.AddAsync(userList);
            await _context.SaveChangesAsync();

            await _gamificationService.AddXpAsync(userId, 30, "ListCreated");
            await _gamificationService.CheckAchievementsAsync(userId, "ListCreated");

            return userList;
        }
        public async Task AddGameToListAsync(int listId, int rawgGameId, int userId)
        {
            var list = await _context.UserLists.FirstOrDefaultAsync(l => l.Id == listId);
            if (list == null)
            {
                throw new KeyNotFoundException("Liste bulunamadı.");
            }

            if (list.UserId != userId)
            {
                throw new UnauthorizedAccessException("Bu liste üzerinde işlem yapma yetkiniz yok.");
            }

            var game = await _gameService.GetOrCreateGameByRawgIdAsync(rawgGameId);

            var gameAlreadyInList = await _context.UserListGames
                .AnyAsync(ulg => ulg.UserListId == listId && ulg.GameId == game.Id);

            if (gameAlreadyInList)
            {
                throw new InvalidOperationException("Bu oyun bu listede zaten mevcut.");
            }

            if (list.Type == UserListType.Favorites)
            {
                var currentCount = await _context.UserListGames.CountAsync(ulg => ulg.UserListId == listId);
                if (currentCount >= 5)
                {
                    throw new InvalidOperationException("Favori listesine en fazla 5 oyun ekleyebilirsiniz.");
                }
            }

            var userListGame = new UserListGame
            {
                UserListId = listId,
                GameId = game.Id
            };

            await _context.UserListGames.AddAsync(userListGame);
            await _context.SaveChangesAsync();

            var followers = await _context.UserListFollows
            .Where(f => f.FollowedListId == listId)
            .ToListAsync();

            if (followers.Any())
            {
                var notificationMessage = $"Takip ettiğin '{list.Name}' listesine yeni bir oyun eklendi.";
                foreach (var follower in followers)
                {
                    if (follower.FollowerUserId != list.UserId)
                    {
                        await _notificationService.CreateNotificationAsync(follower.FollowerUserId, notificationMessage, NotificationType.ListFollow, $"/lists/{list.Id}");
                    }
                }
            }
        }
        public async Task<IEnumerable<UserListDto>> GetListsForUserAsync(int userId, int? rawgGameId = null)
        {
            // Select projection — Include yerine tek SQL sorgusu, uzak DB'de çok daha hızlı
            var listDtos = await _context.UserLists
                .Where(l => l.UserId == userId)
                .Where(l => l.Type != UserListType.Wishlist && l.Type != UserListType.Favorites)
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => new UserListDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Visibility = l.Visibility,
                    Category = l.Category,
                    AverageRating = l.AverageRating,
                    RatingCount = l.RatingCount,
                    CreatedAt = l.CreatedAt,
                    UpdatedAt = l.UpdatedAt,
                    GameCount = l.UserListGames.Count(),
                    FollowerCount = l.Followers.Count(),
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        FirstName = l.User.FirstName,
                        LastName = l.User.LastName
                    },
                    Type = (int)l.Type,
                    ContainsCurrentGame = rawgGameId.HasValue && l.UserListGames.Any(ulg => ulg.Game.RawgId == rawgGameId.Value),
                    FirstGameImageUrls = l.UserListGames
                                          .OrderBy(ulg => ulg.AddedAt)
                                          .Select(ulg => ulg.Game.BackgroundImage)
                                          .Take(4)
                                          .ToList()
                })
                .ToListAsync();

            return listDtos;
        }
        public async Task<UserListDetailDto?> GetMyListDetailAsync(int listId, int userId)
        {
            var list = await _context.UserLists
                .Include(l => l.UserListGames)
                    .ThenInclude(ulg => ulg.Game)
                .Where(l => l.Id == listId && l.UserId == userId)
                .Select(l => new UserListDetailDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Visibility = l.Visibility,
                    Category = l.Category,
                    AverageRating = l.AverageRating,
                    RatingCount = l.RatingCount,
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        FirstName = l.User.FirstName,
                        LastName = l.User.LastName,
                    },  
                    UpdatedAt = l.UpdatedAt,
                    FollowerCount = l.Followers.Count(),
                    Games = l.UserListGames.Select(ulg => new GameSummaryDto
                    {
                        Id = ulg.Game.Id,
                        RawgId = ulg.Game.RawgId,
                        Name = ulg.Game.Name,
                        Slug = ulg.Game.Slug,
                        CoverImage = ulg.Game.CoverImage,
                        BackgroundImage = ulg.Game.BackgroundImage,
                        Released = ulg.Game.Released,
                        GghubRating = ulg.Game.AverageRating,
                        GghubRatingCount = ulg.Game.RatingCount
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            return list;
        }

        public async Task<UserListDetailDto> GetListDetailAsync(int listId, int? currentUserId)
        {
            // Önce sadece erişim kontrolü için lightweight sorgu
            var listMeta = await _context.UserLists
                .Where(l => l.Id == listId)
                .Select(l => new { l.UserId, l.Visibility })
                .FirstOrDefaultAsync();

            if (listMeta == null)
                throw new KeyNotFoundException("Liste bulunamadı.");

            if (!currentUserId.HasValue)
            {
                if (listMeta.Visibility != ListVisibilitySetting.Public)
                    throw new UnauthorizedAccessException("Bu listeyi görüntülemek için giriş yapmalısınız.");
            }
            else if (listMeta.UserId != currentUserId.Value)
            {
                if (listMeta.Visibility == ListVisibilitySetting.Private)
                    throw new UnauthorizedAccessException("Bu listeyi görme yetkiniz yok.");

                if (listMeta.Visibility == ListVisibilitySetting.Followers)
                {
                    var isFollowingOwner = await _context.Follows
                        .AnyAsync(f => f.FollowerId == currentUserId.Value && f.FolloweeId == listMeta.UserId);
                    if (!isFollowingOwner)
                        throw new UnauthorizedAccessException("Bu listeyi sadece sahibinin takipçileri görebilir.");
                }
            }

            // Tek Select projection sorgusu — Include + AsSplitQuery yerine
            var detail = await _context.UserLists
                .Where(l => l.Id == listId)
                .Select(l => new UserListDetailDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Visibility = l.Visibility,
                    Category = l.Category,
                    UpdatedAt = l.UpdatedAt,
                    GameCount = l.UserListGames.Count(),
                    FollowerCount = l.Followers.Count(),
                    RatingCount = l.RatingCount,
                    AverageRating = l.AverageRating,
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        FirstName = l.User.FirstName,
                        LastName = l.User.LastName,
                    },
                    Games = l.UserListGames.Select(ulg => new GameSummaryDto
                    {
                        Id = ulg.Game.Id,
                        RawgId = ulg.Game.RawgId,
                        Name = ulg.Game.Name,
                        Slug = ulg.Game.Slug,
                        CoverImage = ulg.Game.CoverImage,
                        BackgroundImage = ulg.Game.BackgroundImage,
                        Released = ulg.Game.Released,
                        Rating = ulg.Game.Rating,
                        Metacritic = ulg.Game.Metacritic,
                        GghubRating = ulg.Game.AverageRating,
                        GghubRatingCount = ulg.Game.RatingCount
                    }).ToList(),
                    IsFollowing = currentUserId.HasValue && listMeta.UserId != currentUserId.Value &&
                        _context.UserListFollows.Any(f => f.FollowedListId == listId && f.FollowerUserId == currentUserId.Value)
                })
                .FirstOrDefaultAsync();

            return detail!;
        }

        public async Task<PaginatedResult<UserListPublicDto>> GetPublicListsAsync(ListQueryParams query, int? currentUserId)
        {
            var baseQuery = _context.UserLists
                .Where(l =>
                    l.Visibility == ListVisibilitySetting.Public ||
                    (currentUserId.HasValue &&
                     l.Visibility == ListVisibilitySetting.Followers &&
                     _context.Follows.Any(f => f.FollowerId == currentUserId.Value && f.FolloweeId == l.UserId))
                );

            if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            {
                var searchTermLower = query.SearchTerm.ToLower();
                baseQuery = baseQuery.Where(l => l.Name.ToLower().Contains(searchTermLower) ||
                                                 (l.Description != null && l.Description.ToLower().Contains(searchTermLower)));
            }

            if (query.Category.HasValue && query.Category.Value != ListCategory.Other)
            {
                baseQuery = baseQuery.Where(l => l.Category == query.Category.Value);
            }

            if (query.FollowedByMe == true && currentUserId.HasValue)
            {
                baseQuery = baseQuery.Where(l =>
                    _context.Follows.Any(f => f.FollowerId == currentUserId.Value && f.FolloweeId == l.UserId)
                );
            }

            var totalCount = await baseQuery.CountAsync();

            // Select projection — Include/AsSplitQuery yerine tek sorgu
            var itemDtos = await baseQuery
                .OrderByDescending(l => l.UpdatedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(l => new UserListPublicDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Category = l.Category,
                    UpdatedAt = l.UpdatedAt,
                    GameCount = l.UserListGames.Count(),
                    FollowerCount = l.Followers.Count(),
                    AverageRating = l.AverageRating,
                    RatingCount = l.RatingCount,
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        IsFollowing = currentUserId.HasValue &&
                            _context.Follows.Any(f => f.FollowerId == currentUserId.Value && f.FolloweeId == l.UserId)
                    },
                    Visibility = l.Visibility,
                    FirstGameImageUrls = l.UserListGames
                                         .OrderBy(ulg => ulg.AddedAt)
                                         .Select(ulg => ulg.Game.BackgroundImage)
                                         .Take(4)
                                         .ToList()
                })
                .ToListAsync();

            return new PaginatedResult<UserListPublicDto>
            {
                Items = itemDtos,
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }
        public async Task<PaginatedResult<UserListPublicDto>> GetFollowedListsByUserAsync(int targetUserId, int currentUserId, ListQueryParams queryParams)
        {
            var followedListIdsQuery = _context.UserListFollows
                .Where(f => f.FollowerUserId == targetUserId)
                .Select(f => f.FollowedListId);

            var baseQuery = _context.UserLists
                .Where(l => followedListIdsQuery.Contains(l.Id))
                .Where(l =>
                    l.Visibility == ListVisibilitySetting.Public ||
                    l.UserId == currentUserId ||
                    (l.Visibility == ListVisibilitySetting.Followers &&
                        _context.Follows.Any(f => f.FollowerId == currentUserId && f.FolloweeId == l.UserId))
                 );

            if (!string.IsNullOrWhiteSpace(queryParams.SearchTerm))
            {
                var searchTermLower = queryParams.SearchTerm.ToLower();
                baseQuery = baseQuery.Where(l => l.Name.ToLower().Contains(searchTermLower) ||
                                                 (l.Description != null && l.Description.ToLower().Contains(searchTermLower)));
            }
            if (queryParams.Category.HasValue && queryParams.Category.Value != ListCategory.Other)
            {
                baseQuery = baseQuery.Where(l => l.Category == queryParams.Category.Value);
            }

            var totalCount = await baseQuery.CountAsync();

            var itemDtos = await baseQuery
                .OrderByDescending(l => l.UpdatedAt)
                .Skip((queryParams.Page - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .Select(l => new UserListPublicDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Category = l.Category,
                    UpdatedAt = l.UpdatedAt,
                    GameCount = l.UserListGames.Count(),
                    FollowerCount = l.Followers.Count(),
                    AverageRating = l.AverageRating,
                    RatingCount = l.RatingCount,
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        IsFollowing = _context.Follows.Any(f => f.FollowerId == currentUserId && f.FolloweeId == l.UserId)
                    },
                    Visibility = l.Visibility,
                    FirstGameImageUrls = l.UserListGames
                                        .OrderBy(ulg => ulg.AddedAt)
                                        .Select(ulg => ulg.Game.BackgroundImage)
                                        .Take(4)
                                        .ToList(),
                    IsFollowing = _context.UserListFollows.Any(f => f.FollowerUserId == currentUserId && f.FollowedListId == l.Id)
                })
                .ToListAsync();

            return new PaginatedResult<UserListPublicDto>
            {
                Items = itemDtos,
                TotalCount = totalCount,
                Page = queryParams.Page,
                PageSize = queryParams.PageSize
            };
        }


        public async Task<bool> RemoveGameFromListAsync(int listId, int rawgGameId, int userId)
        {
            var list = await _context.UserLists.FirstOrDefaultAsync(l => l.Id == listId);
            if (list == null || list.UserId != userId)
            {
                return false;
            }

            var game = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgGameId);
            if (game == null)
            {
                return false;
            }

            var userListGame = await _context.UserListGames
                .FirstOrDefaultAsync(ulg => ulg.UserListId == list.Id && ulg.GameId == game.Id);

            if (userListGame == null)
            {
                return false;
            }

            _context.UserListGames.Remove(userListGame);
            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<bool> UpdateListAsync(int listId, UserListForUpdateDto dto, int userId)
        {
            var list = await _context.UserLists.FirstOrDefaultAsync(l => l.Id == listId);

            if (list == null)
            {
                throw new KeyNotFoundException("Liste bulunamadı.");
            }

            if (list.UserId != userId)
            {
                throw new UnauthorizedAccessException("Bu liste üzerinde işlem yapma yetkiniz yok.");
            }

            var nameExists = await _context.UserLists
                .AnyAsync(l => l.UserId == userId &&
                               l.Name.ToLower() == dto.Name.ToLower() &&
                               l.Id != listId);

            if (nameExists)
            {
                throw new InvalidOperationException("Bu isimde başka bir listeniz zaten mevcut.");
            }

            list.Name = dto.Name;
            list.Description = dto.Description;
            list.Visibility = dto.Visibility;
            list.Category = dto.Category;
            list.UpdatedAt = DateTime.UtcNow;

            return await _context.SaveChangesAsync() > 0;
        }
        public async Task<bool> DeleteListAsync(int listId, int userId)
        {
            var list = await _context.UserLists.FirstOrDefaultAsync(l => l.Id == listId);

            if (list == null)
            {
                throw new KeyNotFoundException("Silinecek liste bulunamadı.");
            }

            if (list.UserId != userId)
            {
                throw new UnauthorizedAccessException("Bu liste üzerinde işlem yapma yetkiniz yok.");
            }

            _context.UserLists.Remove(list);
            var result = await _context.SaveChangesAsync() > 0;

            if (result)
            {
                await _gamificationService.AddXpAsync(userId, -30, "ListDeleted");
            }

            return result;
        }
        public async Task<bool> ToggleWishlistAsync(int userId, int rawgGameId)
        {
            var game = await _gameService.GetOrCreateGameByRawgIdAsync(rawgGameId);

            var wishlist = await _context.UserLists
                .FirstOrDefaultAsync(l => l.UserId == userId && l.Type == UserListType.Wishlist);

            if (wishlist == null)
            {
                wishlist = new UserList
                {
                    UserId = userId,
                    Name = "İstek Listem",
                    Description = "Takip ettiğim oyunlar",
                    Category = ListCategory.Other,
                    Type = UserListType.Wishlist,
                    Visibility = ListVisibilitySetting.Private,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.UserLists.AddAsync(wishlist);
                await _context.SaveChangesAsync();
            }

            var existingItem = await _context.UserListGames
                .FirstOrDefaultAsync(ulg => ulg.UserListId == wishlist.Id && ulg.GameId == game.Id);

            if (existingItem != null)
            {
                _context.UserListGames.Remove(existingItem);
                await _context.SaveChangesAsync();
                return false; 
            }
            else
            {
                await _context.UserListGames.AddAsync(new UserListGame
                {
                    UserListId = wishlist.Id,
                    GameId = game.Id,
                    AddedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                return true; 
            }
        }

        public async Task<bool> CheckWishlistStatusAsync(int userId, int gameId)
        {
            var wishlist = await _context.UserLists
                .FirstOrDefaultAsync(l => l.UserId == userId && l.Type == UserListType.Wishlist);

            if (wishlist == null) return false;

            return await _context.UserListGames
                .AnyAsync(ulg => ulg.UserListId == wishlist.Id && ulg.GameId == gameId);
        }

        public async Task<UserListDetailDto?> GetWishlistForUserAsync(int userId)
        {
            return await _context.UserLists
                .Where(l => l.UserId == userId && l.Type == UserListType.Wishlist)
                .Select(l => new UserListDetailDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Visibility = l.Visibility,
                    Category = l.Category,
                    UpdatedAt = l.UpdatedAt,
                    GameCount = l.UserListGames.Count(),
                    FollowerCount = l.Followers.Count(),
                    RatingCount = l.RatingCount,
                    AverageRating = l.AverageRating,
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        FirstName = l.User.FirstName,
                        LastName = l.User.LastName,
                    },
                    Games = l.UserListGames.Select(ulg => new GameSummaryDto
                    {
                        Id = ulg.Game.Id,
                        RawgId = ulg.Game.RawgId,
                        Name = ulg.Game.Name,
                        Slug = ulg.Game.Slug,
                        CoverImage = ulg.Game.CoverImage,
                        BackgroundImage = ulg.Game.BackgroundImage,
                        Released = ulg.Game.Released,
                        Rating = ulg.Game.Rating,
                        Metacritic = ulg.Game.Metacritic,
                        GghubRating = ulg.Game.AverageRating,
                        GghubRatingCount = ulg.Game.RatingCount
                    }).ToList(),
                    IsFollowing = false
                })
                .FirstOrDefaultAsync();
        }
        public async Task<IEnumerable<UserListDto>> GetListsByUsernameAsync(string username, int? currentUserId)
        {
            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (targetUser == null) return Enumerable.Empty<UserListDto>();

            var query = _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == targetUser.Id)
                .Where(l => l.Type != UserListType.Wishlist && l.Type != UserListType.Favorites);

            if (currentUserId != targetUser.Id)
            {
                var isFollowing = currentUserId.HasValue &&
                                  await _context.Follows.AnyAsync(f => f.FollowerId == currentUserId && f.FolloweeId == targetUser.Id);

                query = query.Where(l =>
                    l.Visibility == ListVisibilitySetting.Public ||
                    (l.Visibility == ListVisibilitySetting.Followers && isFollowing)
                );
            }

            return await query
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => new UserListDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    Visibility = l.Visibility,
                    Category = l.Category,
                    AverageRating = l.AverageRating,
                    RatingCount = l.RatingCount,
                    CreatedAt = l.CreatedAt,
                    UpdatedAt = l.UpdatedAt,
                    GameCount = l.UserListGames.Count(),
                    FollowerCount = l.Followers.Count(),
                    Owner = new UserDto
                    {
                        Id = l.User.Id,
                        Username = l.User.Username,
                        ProfileImageUrl = l.User.ProfileImageUrl,
                        FirstName = l.User.FirstName,
                        LastName = l.User.LastName
                    },
                    Type = (int)l.Type,
                    PreviewGames = l.UserListGames
                        .OrderBy(ulg => ulg.AddedAt)
                        .Select(ulg => new ListGamePreviewDto
                        {
                            Id = ulg.Game.Id,
                            Name = ulg.Game.Name,
                            Slug = ulg.Game.Slug,
                            CoverImage = ulg.Game.CoverImage ?? ulg.Game.BackgroundImage
                        })
                        .Take(5)
                        .ToList()
                })
                .ToListAsync();
        }
        public async Task<bool> ToggleFavoriteAsync(int userId, int rawgGameId)
        {
            var game = await _gameService.GetOrCreateGameByRawgIdAsync(rawgGameId);

            var favoritesList = await _context.UserLists
                .Include(l => l.UserListGames)
                .FirstOrDefaultAsync(l => l.UserId == userId && l.Type == UserListType.Favorites);

            if (favoritesList == null)
            {
                favoritesList = new UserList
                {
                    UserId = userId,
                    Name = "Favori Oyunlarım",
                    Description = "En sevdiğim, vitrinlik oyunlar.",
                    Category = ListCategory.Other,
                    Type = UserListType.Favorites,
                    Visibility = ListVisibilitySetting.Public,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.UserLists.AddAsync(favoritesList);
                await _context.SaveChangesAsync();
            }

            var existingItem = favoritesList.UserListGames
                .FirstOrDefault(ulg => ulg.GameId == game.Id);

            if (existingItem != null)
            {
                _context.UserListGames.Remove(existingItem);
                await _context.SaveChangesAsync();
                return false; 
            }
            else
            {
                if (favoritesList.UserListGames.Count >= 5)
                {
                    throw new InvalidOperationException("Favori listesine en fazla 5 oyun ekleyebilirsiniz.");
                }

                await _context.UserListGames.AddAsync(new UserListGame
                {
                    UserListId = favoritesList.Id,
                    GameId = game.Id,
                    AddedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                return true;
            }
        }

        public async Task<bool> CheckFavoriteStatusAsync(int userId, int rawgGameId)
        {
            return await _context.UserListGames
                .AnyAsync(ulg => ulg.UserList.UserId == userId
                    && ulg.UserList.Type == UserListType.Favorites
                    && ulg.Game.RawgId == rawgGameId);
        }

        public async Task<UserListDto?> GetFavoritesListByUsernameAsync(string username)
        {
            var targetUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);
            if (targetUser == null) return null;

            var favList = await _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == targetUser.Id && l.Type == UserListType.Favorites)
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game)
                .FirstOrDefaultAsync();

            if (favList == null) return null;

            return new UserListDto
            {
                Id = favList.Id,
                Name = favList.Name,
                Type = (int)favList.Type,
                PreviewGames = favList.UserListGames
                    .OrderBy(ulg => ulg.AddedAt)
                    .Select(ulg => new ListGamePreviewDto
                    {
                        Id = ulg.Game.Id,
                        Name = ulg.Game.Name,
                        Slug = ulg.Game.Slug,
                        CoverImage = ulg.Game.CoverImage ?? ulg.Game.BackgroundImage
                    })
                    .Take(5)
                    .ToList()
            };
        }
    }
}