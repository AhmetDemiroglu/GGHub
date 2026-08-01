using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IActivityService
    {
        Task<IEnumerable<ActivityDto>> GetUserActivityFeedAsync(string username, int? currentUserId = null, int limit = 20);

        /// <summary>
        /// Eski istemci yolu (?type=). Mağazadaki surumler bunu cagiriyor,
        /// davranisi DEGISMEZ ve Post/Repost tipi URETMEZ.
        /// </summary>
        Task<IEnumerable<ActivityDto>> GetPersonalizedFeedAsync(int currentUserId, int limit = 20, DateTime? cursor = null, ActivityType? type = null);

        /// <summary>Yeni istemci yolu (?tab=): Gonderiler / Incelemeler / Kesfet.</summary>
        Task<IEnumerable<ActivityDto>> GetFeedAsync(int currentUserId, FeedTab tab, int limit = 20, DateTime? cursor = null);
    }
}
