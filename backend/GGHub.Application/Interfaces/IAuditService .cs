namespace GGHub.Application.Interfaces
{
    public interface IAuditService
    {
        Task LogAsync(int userId, string actionType, string entityType, int entityId, object? changes = null);
    }
}
