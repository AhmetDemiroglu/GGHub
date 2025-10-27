using System.Threading.Tasks;
using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IUserListRatingService
    {
        Task SubmitRatingAsync(int listId, int userId, UserListRatingForUpsertDto dto);
        Task<int?> GetMyRatingForListAsync(int listId, int userId);
    }
}