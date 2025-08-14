using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;

namespace GGHub.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly GGHubDbContext _context;
        public NotificationService(GGHubDbContext context)
        {
            _context = context;
        }
        public async Task CreateNotificationAsync(int recipientUserId, string message, string? link = null)
        {
            var notification = new Notification
            {
                RecipientUserId = recipientUserId,
                Message = message,
                Link = link
            };
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
        }
    }
}