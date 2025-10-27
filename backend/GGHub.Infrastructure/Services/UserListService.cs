using GGHub.Application.Dtos;
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
        public async Task<UserListDetailDto?> GetListByIdAsync(int listId, int userId)
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
    }
}