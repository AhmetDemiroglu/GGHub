using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace GGHub.WebAPI.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IUserConnectionService _connectionService;
        private readonly ILogger<ChatHub> _logger;

        public ChatHub(IUserConnectionService connectionService, ILogger<ChatHub> logger)
        {
            _connectionService = connectionService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                _connectionService.AddConnection(userId.Value, Context.ConnectionId);
                _logger.LogInformation("User {UserId} connected with connection {ConnectionId}", userId.Value, Context.ConnectionId);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            _connectionService.RemoveConnection(Context.ConnectionId);

            if (userId.HasValue)
            {
                _logger.LogInformation("User {UserId} disconnected (connection {ConnectionId})", userId.Value, Context.ConnectionId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinConversation(string partnerUsername)
        {
            var groupName = GetConversationGroup(GetUserId()?.ToString() ?? "", partnerUsername);
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        public async Task LeaveConversation(string partnerUsername)
        {
            var groupName = GetConversationGroup(GetUserId()?.ToString() ?? "", partnerUsername);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        private int? GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                return userId;
            }
            return null;
        }

        private static string GetConversationGroup(string userId, string partnerUsername)
        {
            return $"conversation_{userId}_{partnerUsername}";
        }
    }
}
