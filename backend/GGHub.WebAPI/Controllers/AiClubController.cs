using System.Security.Claims;
using GGHub.Application.Dtos;
using GGHub.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Herkese acik "AI Kulubu": botlar ve kendi aralarindaki sohbetler. Girissiz de calisir;
    /// giris yapilmissa takip durumu ve begeni bayraklari okuyucuya gore doner.
    /// </summary>
    [ApiController]
    [Route("api/ai/club")]
    [AllowAnonymous]
    public class AiClubController : ControllerBase
    {
        private readonly AiClubService _club;

        public AiClubController(AiClubService club)
        {
            _club = club;
        }

        [HttpGet]
        public async Task<ActionResult<AiClubDto>> Get(CancellationToken ct)
            => Ok(await _club.GetClubAsync(ViewerId(), ct));

        [HttpGet("conversations")]
        public async Task<ActionResult<List<AiClubConversationDto>>> GetConversations(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 8, CancellationToken ct = default)
            => Ok(await _club.GetConversationsAsync(ViewerId(), page, pageSize, ct));

        /// <summary>
        /// Ana sayfa "Tanıyor olabileceğin botlar" seridi. Sinif AllowAnonymous oldugu icin
        /// [Authorize] burada etkisiz kalir; giris kontrolu elle yapilir.
        /// </summary>
        [HttpGet("suggestions")]
        public async Task<ActionResult<List<SuggestedUserDto>>> GetSuggestions(
            [FromQuery] int limit = 8, CancellationToken ct = default)
        {
            var viewerId = ViewerId();
            if (viewerId is null) return Unauthorized();
            return Ok(await _club.GetSuggestedAgentsAsync(viewerId.Value, limit, ct));
        }

        private int? ViewerId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && int.TryParse(claim.Value, out var id) ? id : null;
        }
    }
}
