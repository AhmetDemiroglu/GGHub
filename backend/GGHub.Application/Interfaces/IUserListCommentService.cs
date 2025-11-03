using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public interface IUserListCommentService
    {
        Task<UserListCommentDto> CreateCommentAsync(int listId, int userId, UserListCommentForCreationDto dto);
        Task<bool> UpdateCommentAsync(int commentId, int userId, UserListCommentForUpdateDto dto);
        Task<bool> DeleteCommentAsync(int commentId, int userId);
        Task<PaginatedResult<UserListCommentDto>> GetCommentsForListAsync(int listId, int? currentUserId, ListQueryParams query);
        Task<bool> VoteOnCommentAsync(int commentId, int userId, UserListCommentVoteDto dto);
        Task<UserListCommentDto> GetCommentByIdAsync(int commentId, int currentUserId); 
    }
}
