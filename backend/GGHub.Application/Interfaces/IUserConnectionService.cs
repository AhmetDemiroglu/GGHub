namespace GGHub.Application.Interfaces
{
    public interface IUserConnectionService
    {
        void AddConnection(int userId, string connectionId);
        void RemoveConnection(string connectionId);
        IReadOnlyList<string> GetConnections(int userId);
        bool IsUserOnline(int userId);
    }
}
