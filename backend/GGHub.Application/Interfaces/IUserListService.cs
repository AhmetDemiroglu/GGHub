﻿using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    public interface IUserListService
    {
        Task<UserList> CreateListAsync(UserListForCreationDto listDto, int userId);
        Task AddGameToListAsync(int listId, int rawgGameId, int userId);
        Task<IEnumerable<UserListDto>> GetListsForUserAsync(int userId);
        Task<UserListDetailDto?> GetMyListDetailAsync(int listId, int userId);
        Task<UserListDetailDto> GetListDetailAsync(int listId, int currentUserId);
        Task<PaginatedResult<UserListPublicDto>> GetPublicListsAsync(ListQueryParams query);
        Task<bool> RemoveGameFromListAsync(int listId, int rawgGameId, int userId);
        Task<bool> UpdateListAsync(int listId, UserListForUpdateDto dto, int userId);
        Task<bool> DeleteListAsync(int listId, int userId);
    }
}