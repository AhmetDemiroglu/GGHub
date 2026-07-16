using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public interface IReviewCommentService
    {
        Task<ReviewCommentDto> CreateCommentAsync(int reviewId, int userId, ReviewCommentForCreationDto dto);
        Task<bool> UpdateCommentAsync(int commentId, int userId, ReviewCommentForUpdateDto dto);
        Task<bool> DeleteCommentAsync(int commentId, int userId);
        Task<PaginatedResult<ReviewCommentDto>> GetCommentsForReviewAsync(int reviewId, int? currentUserId, ListQueryParams query);
        Task<bool> VoteOnCommentAsync(int commentId, int userId, ReviewCommentVoteDto dto);
        Task<ReviewCommentDto> GetCommentByIdAsync(int commentId, int currentUserId);
    }
}
