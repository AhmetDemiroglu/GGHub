using GGHub.Application.Dtos;
using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    public interface IUserListService
    {
        Task<UserList> CreateListAsync(UserListForCreationDto listDto, int userId);
        Task AddGameToListAsync(int listId, int rawgGameId, int userId);
        Task<IEnumerable<UserListDto>> GetListsForUserAsync(int userId);
        Task<UserListDetailDto?> GetListByIdAsync(int listId, int userId);
        Task<bool> RemoveGameFromListAsync(int listId, int rawgGameId, int userId); // YENİ EKLENDİ
    }
}