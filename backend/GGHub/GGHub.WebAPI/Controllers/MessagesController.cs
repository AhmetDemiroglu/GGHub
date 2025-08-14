using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class MessagesController : ControllerBase
    {
        private readonly ISocialService _socialService;

        public MessagesController(ISocialService socialService)
        {
            _socialService = socialService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateMessage(MessageForCreationDto messageDto)
        {
            var senderId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var createdMessage = await _socialService.SendMessageAsync(senderId, messageDto);
                if (createdMessage == null)
                {
                    return NotFound("Alıcı kullanıcı bulunamadı.");
                }

                return StatusCode(201, createdMessage);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var conversations = await _socialService.GetConversationsAsync(userId);
            return Ok(conversations);
        }
        [HttpGet("thread/{partnerUsername}")]
        public async Task<IActionResult> GetMessageThread(string partnerUsername)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var messages = await _socialService.GetMessageThreadAsync(userId, partnerUsername);
                return Ok(messages);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}