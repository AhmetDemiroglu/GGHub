using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    public class AuditService : IAuditService
    {
        private readonly GGHubDbContext _context;

        public AuditService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(int userId, string actionType, string entityType, int entityId, object? changes = null)
        {
            var auditLog = new AuditLog
            {
                UserId = userId,
                ActionType = actionType,
                EntityType = entityType,
                EntityId = entityId,
                Timestamp = DateTime.UtcNow,
                Changes = changes != null ? JsonSerializer.Serialize(changes) : null
            };

            await _context.AuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();
        }
    }
}