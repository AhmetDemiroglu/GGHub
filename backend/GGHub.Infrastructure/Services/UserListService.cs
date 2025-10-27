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
                var notificationMessage = $"Takip ettiğiniz '{list.Name}' listesine yeni bir oyun eklendi.";
                foreach (var follower in followers)
                {
                    if (follower.FollowerUserId != list.UserId)
                    {
                        await _notificationService.CreateNotificationAsync(follower.FollowerUserId, notificationMessage, NotificationType.ListFollow, $"/lists/{list.Id}");
                    }
                }
            }
        }
        public async Task<IEnumerable<UserListDto>> GetListsForUserAsync(int userId)
        {
            var lists = await _context.UserLists
                .Where(l => l.UserId == userId)
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
                    FollowerCount = l.Followers.Count()
                })
                .ToListAsync();

            return lists;
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
                        Released = ulg.Game.Released
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            return list;
        }

        public async Task<UserListDetailDto> GetListDetailAsync(int listId, int currentUserId)
        {
            var list = await _context.UserLists
                .Include(l => l.User)
                .Include(l => l.UserListGames) 
                    .ThenInclude(ulg => ulg.Game)
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == listId);

            if (list == null)
            {
                throw new KeyNotFoundException("Liste bulunamadı.");
            }

            if (list.UserId != currentUserId) 
            {
                if (list.Visibility == ListVisibilitySetting.Private)
                {
                    throw new UnauthorizedAccessException("Bu listeyi görme yetkiniz yok.");
                }

                if (list.Visibility == ListVisibilitySetting.Followers)
                {
                    var isFollowingOwner = await _context.Follows
                        .AnyAsync(f => f.FollowerId == currentUserId && f.FolloweeId == list.UserId);

                    if (!isFollowingOwner)
                    {
                        throw new UnauthorizedAccessException("Bu listeyi sadece sahibinin takipçileri görebilir.");
                    }
                }
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
            }).ToList();

            return new UserListDetailDto
            {
                Id = list.Id,
                Name = list.Name,
                Description = list.Description,
                Visibility = list.Visibility,
                Category = list.Category,
                UpdatedAt = list.UpdatedAt,
                GameCount = list.UserListGames.Count, // Bu hala doğru
                FollowerCount = await _context.UserListFollows.CountAsync(f => f.FollowedListId == listId), // Bu da
                RatingCount = list.RatingCount, // Denormalize
                AverageRating = list.AverageRating, // Denormalize
                Owner = new UserDto 
                {
                    Id = list.User.Id,
                    Username = list.User.Username,
                    ProfileImageUrl = list.User.ProfileImageUrl,
                    FirstName = list.User.FirstName,
                    LastName = list.User.LastName,
                },
                Games = gameSummaries
            };
        }

        public async Task<PaginatedResult<UserListPublicDto>> GetPublicListsAsync(ListQueryParams query)
        {
            var queryable = _context.UserLists
                .Include(l => l.User)
                .Where(l => l.Visibility == ListVisibilitySetting.Public)
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

            var totalCount = await queryable.CountAsync();

            var items = await queryable
                .OrderByDescending(l => l.AverageRating)
                .ThenByDescending(l => l.RatingCount)
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
                        FirstName = l.User.FirstName,
                        LastName = l.User.LastName,
                    }
                })
                .ToListAsync();

            return new PaginatedResult<UserListPublicDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
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
    }
}