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

        public UserListService(GGHubDbContext context, IGameService gameService, INotificationService notificationService)
        {
            _context = context;
            _gameService = gameService;
            _notificationService = notificationService;
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
            var listsFromDb = await _context.UserLists
                .Where(l => l.UserId == userId)
                .Include(l => l.User)                             
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game) 
                .Include(l => l.Followers)                        
                .AsSplitQuery()                                   
                .AsNoTracking()                                   
                .OrderByDescending(l => l.UpdatedAt)
                .ToListAsync();

            var listDtos = listsFromDb.Select(listEntity => new UserListDto 
            {
                Id = listEntity.Id, 
                Name = listEntity.Name, 
                Description = listEntity.Description, 
                Visibility = listEntity.Visibility, 
                Category = listEntity.Category, 
                AverageRating = listEntity.AverageRating,
                RatingCount = listEntity.RatingCount, 
                CreatedAt = listEntity.CreatedAt, 
                UpdatedAt = listEntity.UpdatedAt, 
                GameCount = listEntity.UserListGames.Count(), 
                FollowerCount = listEntity.Followers.Count(),
                Owner = new UserDto
                {
                    Id = listEntity.User.Id,
                    Username = listEntity.User.Username,
                    ProfileImageUrl = listEntity.User.ProfileImageUrl,
                    FirstName = listEntity.User.FirstName,
                    LastName = listEntity.User.LastName
                },
                Type = (int)listEntity.Type,
                ContainsCurrentGame = rawgGameId.HasValue && listEntity.UserListGames.Any(ulg => ulg.Game.RawgId == rawgGameId.Value),
                FirstGameImageUrls = listEntity.UserListGames 
                                      .OrderBy(ulg => ulg.AddedAt)
                                      .Select(ulg => ulg.Game.BackgroundImage)
                                      .Take(4)
                                      .ToList()
            }).ToList();

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
            var list = await _context.UserLists
                .Include(l => l.User)
                .Include(l => l.UserListGames)
                    .ThenInclude(ulg => ulg.Game)
                    .AsSplitQuery()    
                    .AsNoTracking()
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == listId);

            if (list == null)
            {
                throw new KeyNotFoundException("Liste bulunamadı.");
            }

            if (!currentUserId.HasValue)
            {
                if (list.Visibility != ListVisibilitySetting.Public)
                {
                    throw new UnauthorizedAccessException("Bu listeyi görüntülemek için giriş yapmalısınız.");
                }
            }
            else
            {
                if (list.UserId != currentUserId.Value)
                {
                    if (list.Visibility == ListVisibilitySetting.Private)
                    {
                        throw new UnauthorizedAccessException("Bu listeyi görme yetkiniz yok.");
                    }

                    if (list.Visibility == ListVisibilitySetting.Followers)
                    {
                        var isFollowingOwner = await _context.Follows
                            .AnyAsync(f => f.FollowerId == currentUserId.Value && f.FolloweeId == list.UserId);

                        if (!isFollowingOwner)
                        {
                            throw new UnauthorizedAccessException("Bu listeyi sadece sahibinin takipçileri görebilir.");
                        }
                    }
                }
            }

            bool isFollowingThisList = false;
            if (currentUserId.HasValue && list.UserId != currentUserId.Value)
            {
                isFollowingThisList = await _context.UserListFollows
                    .AnyAsync(f => f.FollowedListId == listId && f.FollowerUserId == currentUserId.Value);
            }

            var gameSummaries = list.UserListGames.Select(ulg => new GameSummaryDto
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
            }).ToList();

            return new UserListDetailDto
            {
                Id = list.Id,
                Name = list.Name,
                Description = list.Description,
                Visibility = list.Visibility,
                Category = list.Category,
                UpdatedAt = list.UpdatedAt,
                GameCount = list.UserListGames.Count,
                FollowerCount = await _context.UserListFollows.CountAsync(f => f.FollowedListId == listId),
                RatingCount = list.RatingCount,
                AverageRating = list.AverageRating,
                Owner = new UserDto
                {
                    Id = list.User.Id,
                    Username = list.User.Username,
                    ProfileImageUrl = list.User.ProfileImageUrl,
                    FirstName = list.User.FirstName,
                    LastName = list.User.LastName,
                },
                Games = gameSummaries,
                IsFollowing = isFollowingThisList
            };
        }

        public async Task<PaginatedResult<UserListPublicDto>> GetPublicListsAsync(ListQueryParams query, int? currentUserId)
        {
            var queryable = _context.UserLists
                .Include(l => l.User)                             
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game) 
                .Include(l => l.Followers)                      
                .AsSplitQuery()                                 
                .AsNoTracking()
                .Where(l =>
                    l.Visibility == ListVisibilitySetting.Public ||
                    (currentUserId.HasValue &&
                     l.Visibility == ListVisibilitySetting.Followers &&
                     _context.Follows.Any(f => f.FollowerId == currentUserId.Value && f.FolloweeId == l.UserId))
                )
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query.SearchTerm))
            {
                var searchTermLower = query.SearchTerm.ToLower();
                queryable = queryable.Where(l => l.Name.ToLower().Contains(searchTermLower) ||
                                                 (l.Description != null && l.Description.ToLower().Contains(searchTermLower)));
            }

            if (query.Category.HasValue && query.Category.Value != ListCategory.Other)
            {
                queryable = queryable.Where(l => l.Category == query.Category.Value);
            }

            if (query.FollowedByMe == true && currentUserId.HasValue)
            {
                queryable = queryable.Where(l =>
                    _context.Follows.Any(f => f.FollowerId == currentUserId.Value && f.FolloweeId == l.UserId)
                );
            }

            var totalCount = await queryable.CountAsync();

            var itemsFromDb = await queryable
                .OrderByDescending(l => l.UpdatedAt)                                                 
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var ownerIds = itemsFromDb.Select(l => l.UserId).Distinct().ToList();
            var followedOwnerIds = currentUserId.HasValue
                ? await _context.Follows
                    .Where(f => f.FollowerId == currentUserId.Value && ownerIds.Contains(f.FolloweeId))
                    .Select(f => f.FolloweeId)
                    .ToListAsync()
                : new List<int>();

            var itemDtos = itemsFromDb.Select(l => new UserListPublicDto
            {
                Id = l.Id,
                Name = l.Name,
                Description = l.Description,
                Category = l.Category,
                UpdatedAt = l.UpdatedAt,
                GameCount = l.UserListGames.Count(),
                FollowerCount = l.Followers?.Count() ?? 0,
                AverageRating = l.AverageRating,
                RatingCount = l.RatingCount,
                Owner = new UserDto
                {
                    Id = l.User.Id,
                    Username = l.User.Username,
                    ProfileImageUrl = l.User.ProfileImageUrl,
                    IsFollowing = followedOwnerIds.Contains(l.UserId)
                },
                Visibility = l.Visibility,
                FirstGameImageUrls = l.UserListGames
                                     .OrderBy(ulg => ulg.AddedAt)
                                     .Select(ulg => ulg.Game.BackgroundImage)
                                     .Take(4)
                                     .ToList()
            }).ToList();

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

            var queryable = _context.UserLists
                .Include(l => l.User)                             
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game) 
                .Include(l => l.Followers)                        
                .AsSplitQuery()                                   
                .AsNoTracking()
                .Where(l => followedListIdsQuery.Contains(l.Id)) 
                .Where(l =>
                    l.Visibility == ListVisibilitySetting.Public ||
                    l.UserId == currentUserId || 
                    (l.Visibility == ListVisibilitySetting.Followers &&
                        _context.Follows.Any(f => f.FollowerId == currentUserId && f.FolloweeId == l.UserId))
                 )
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(queryParams.SearchTerm))
            {
                var searchTermLower = queryParams.SearchTerm.ToLower();
                queryable = queryable.Where(l => l.Name.ToLower().Contains(searchTermLower) ||
                                                 (l.Description != null && l.Description.ToLower().Contains(searchTermLower)));
            }
            if (queryParams.Category.HasValue && queryParams.Category.Value != ListCategory.Other)
            {
                queryable = queryable.Where(l => l.Category == queryParams.Category.Value);
            }

            var totalCount = await queryable.CountAsync();

            var itemsFromDb = await queryable
                .OrderByDescending(l => l.UpdatedAt)
                .Skip((queryParams.Page - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .ToListAsync();

            var ownerIds = itemsFromDb.Select(l => l.UserId).Distinct().ToList();
            var followedOwnerIds = await _context.Follows
                .Where(f => f.FollowerId == currentUserId && ownerIds.Contains(f.FolloweeId))
                .Select(f => f.FolloweeId)
                .ToListAsync();

            var listIds = itemsFromDb.Select(l => l.Id).ToList();
            var followedListIdsByCurrentUser = await _context.UserListFollows
                .Where(f => f.FollowerUserId == currentUserId && listIds.Contains(f.FollowedListId))
                .Select(f => f.FollowedListId)
                .ToListAsync();

            var itemDtos = itemsFromDb.Select(l => new UserListPublicDto
            {
                Id = l.Id,
                Name = l.Name,
                Description = l.Description,
                Category = l.Category,
                UpdatedAt = l.UpdatedAt,
                GameCount = l.UserListGames.Count(),
                FollowerCount = l.Followers?.Count() ?? 0,
                AverageRating = l.AverageRating,
                RatingCount = l.RatingCount,
                Owner = new UserDto
                {
                    Id = l.User.Id,
                    Username = l.User.Username,
                    ProfileImageUrl = l.User.ProfileImageUrl,
                    IsFollowing = followedOwnerIds.Contains(l.UserId)
                },
                Visibility = l.Visibility,
                FirstGameImageUrls = l.UserListGames
                                    .OrderBy(ulg => ulg.AddedAt)
                                    .Select(ulg => ulg.Game.BackgroundImage)
                                    .Take(4)
                                    .ToList(),
                IsFollowing = followedListIdsByCurrentUser.Contains(l.Id)
            }).ToList();

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

            return await _context.SaveChangesAsync() > 0;
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
            var list = await _context.UserLists
                .Include(l => l.UserListGames)
                    .ThenInclude(ulg => ulg.Game)
                .Include(l => l.User)
                .Include(l => l.Followers)
                .AsSplitQuery()
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.UserId == userId && l.Type == UserListType.Wishlist);

            if (list == null)
            {
                return null;
            }

            var gameSummaries = list.UserListGames
                .Select(ulg => new GameSummaryDto
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
                })
                .ToList();

            return new UserListDetailDto
            {
                Id = list.Id,
                Name = list.Name,
                Description = list.Description,
                Visibility = list.Visibility,
                Category = list.Category,
                UpdatedAt = list.UpdatedAt,
                GameCount = list.UserListGames.Count,
                FollowerCount = list.Followers?.Count() ?? 0,
                RatingCount = list.RatingCount,
                AverageRating = list.AverageRating,
                Owner = new UserDto
                {
                    Id = list.User.Id,
                    Username = list.User.Username,
                    ProfileImageUrl = list.User.ProfileImageUrl,
                    FirstName = list.User.FirstName,
                    LastName = list.User.LastName,
                },
                Games = gameSummaries,
                IsFollowing = false
            };
        }
        public async Task<IEnumerable<UserListDto>> GetListsByUsernameAsync(string username, int? currentUserId)
        {
            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (targetUser == null) return Enumerable.Empty<UserListDto>();

            var query = _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == targetUser.Id);

            if (currentUserId != targetUser.Id)
            {
                var isFollowing = currentUserId.HasValue &&
                                  await _context.Follows.AnyAsync(f => f.FollowerId == currentUserId && f.FolloweeId == targetUser.Id);

                query = query.Where(l =>
                    l.Visibility == ListVisibilitySetting.Public ||
                    (l.Visibility == ListVisibilitySetting.Followers && isFollowing)
                );
            }

            var listsFromDb = await query
                .Include(l => l.User)
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game)
                .Include(l => l.Followers)
                .AsSplitQuery()
                .OrderByDescending(l => l.UpdatedAt)
                .ToListAsync();

            return listsFromDb.Select(listEntity => new UserListDto
            {
                Id = listEntity.Id,
                Name = listEntity.Name,
                Description = listEntity.Description,
                Visibility = listEntity.Visibility,
                Category = listEntity.Category,
                AverageRating = listEntity.AverageRating,
                RatingCount = listEntity.RatingCount,
                CreatedAt = listEntity.CreatedAt,
                UpdatedAt = listEntity.UpdatedAt,
                GameCount = listEntity.UserListGames.Count,
                FollowerCount = listEntity.Followers.Count,
                Owner = new UserDto
                {
                    Id = listEntity.User.Id,
                    Username = listEntity.User.Username,
                    ProfileImageUrl = listEntity.User.ProfileImageUrl,
                    FirstName = listEntity.User.FirstName,
                    LastName = listEntity.User.LastName
                },
                Type = (int)listEntity.Type,
                FirstGameImageUrls = listEntity.UserListGames
                    .OrderBy(ulg => ulg.AddedAt)
                    .Select(ulg => ulg.Game.BackgroundImage)
                    .Take(4)
                    .ToList()
            }).ToList();
        }
    }
}