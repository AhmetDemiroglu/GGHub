using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.WebAPI.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace GGHub.WebAPI.Services
{
    public class HubNotificationService : IHubNotificationService
    {
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IUserConnectionService _connectionService;
        private readonly ILogger<HubNotificationService> _logger;

        public HubNotificationService(
            IHubContext<ChatHub> hubContext,
            IUserConnectionService connectionService,
            ILogger<HubNotificationService> logger)
        {
            _hubContext = hubContext;
            _connectionService = connectionService;
            _logger = logger;
        }

        public async Task SendMessageAsync(int recipientId, MessageDto message)
        {
            var connections = _connectionService.GetConnections(recipientId);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("ReceiveMessage", message);
                _logger.LogDebug("Sent message to user {UserId} ({Count} connections)", recipientId, connections.Count);
            }
        }

        public async Task SendNotificationAsync(int recipientId, NotificationDto notification)
        {
            var connections = _connectionService.GetConnections(recipientId);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("ReceiveNotification", notification);
            }
        }

        public async Task UpdateUnreadMessageCountAsync(int userId, int count)
        {
            var connections = _connectionService.GetConnections(userId);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("UnreadMessageCountUpdated", count);
            }
        }

        public async Task UpdateUnreadNotificationCountAsync(int userId, int count)
        {
            var connections = _connectionService.GetConnections(userId);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("UnreadNotificationCountUpdated", count);
            }
        }

        public async Task UpdateConversationAsync(int userId, ConversationDto conversation)
        {
            var connections = _connectionService.GetConnections(userId);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("ConversationUpdated", conversation);
            }
        }

        public async Task MessageReadAsync(int senderId, string readerUsername)
        {
            var connections = _connectionService.GetConnections(senderId);
            if (connections.Count > 0)
            {
                await _hubContext.Clients.Clients(connections).SendAsync("MessagesRead", readerUsername);
            }
        }
    }
}
